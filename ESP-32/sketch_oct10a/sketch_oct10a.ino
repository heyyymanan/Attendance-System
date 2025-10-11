/****************************************************
 * ESP32 RFID Attendance System (Offline + Online Ready)
 * Components: ESP32 + RC522 + OLED + DS3231 + DFPlayer Mini
 ****************************************************/

#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DFRobotDFPlayerMini.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DS3231.h>

// ---------- USER CONFIG ----------
bool enableNetworking = true;  // true to enable HTTPS logging
const char* ssid = "JioFiber-4G";
const char* password = "shreejij@2502";

// HTTPS server URL (ngrok HTTPS)
const char* serverURL = "https://a74476cf7b0b.ngrok-free.app/api/attendance/log";

// ---------- OLED SETTINGS ----------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---------- RFID SETTINGS ----------
#define SS_PIN 21
#define RST_PIN 22
MFRC522 rfid(SS_PIN, RST_PIN);

// ---------- DFPLAYER SETTINGS ----------
HardwareSerial mp3Serial(2);
DFRobotDFPlayerMini mp3;

// ---------- RTC SETTINGS ----------
DS3231 rtc;

// ---------- LED SETTINGS ----------
int ledPins[5] = {2, 15, 25, 26, 27};  // 5 LEDs for 5 employees

// ---------- EMPLOYEE DATABASE ----------
String employeeUIDs[5] = {
  "B3 D0 76 34",
  "E3 93 56 78",
  "11 22 33 44",
  "55 66 77 88",
  "AA BB CC DD"
};

String employeeNames[5] = {
  "Manan",
  "Ravi",
  "Sneha",
  "Karan",
  "Neha"
};

bool isCheckedIn[5] = {false, false, false, false, false};

// ---------- FUNCTION DECLARATIONS ----------
void connectWiFi();
void sendLogToServer(String uid, String status, String name);
String getDateTimeString();
void displayMessage(String line1, String line2, String line3);

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  SPI.begin();
  Wire.begin(5, 4); // SDA=5, SCL=4

  // LED INIT
  for (int i = 0; i < 5; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }

  // OLED INIT
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("❌ OLED init failed!");
    for (;;);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 0);
  display.println("Initializing System...");
  display.display();

  // RFID INIT
  rfid.PCD_Init();
  Serial.println("✅ RFID Ready");

  // DFPLAYER INIT
  mp3Serial.begin(9600, SERIAL_8N1, 16, 17);
  if (!mp3.begin(mp3Serial)) {
    Serial.println("❌ DFPlayer Mini not found!");
    displayMessage("DFPlayer Error", "Check Wiring/SD", "");
  } else {
    Serial.println("✅ DFPlayer Ready");
    mp3.volume(25);
  }

  // RTC INIT (no begin() needed)
  Serial.println("✅ RTC Ready");

  // NETWORK INIT
  if (enableNetworking) connectWiFi();

  delay(1000);
  displayMessage("RFID Attendance", "System Ready", "");
  Serial.println("🚀 System Ready!");
}

// ---------- MAIN LOOP ----------
void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String UID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i != 0) UID += " ";
    if (rfid.uid.uidByte[i] < 0x10) UID += "0";
    UID += String(rfid.uid.uidByte[i], HEX);
  }
  UID.toUpperCase();

  Serial.println("\n-----------------------------------");
  Serial.println("🪪 Scanned UID: " + UID);

  int empIndex = -1;
  for (int i = 0; i < 5; i++) {
    if (UID == employeeUIDs[i]) {
      empIndex = i;
      break;
    }
  }

  if (empIndex != -1) {
    String name = employeeNames[empIndex];
    String status;

    if (!isCheckedIn[empIndex]) {
      isCheckedIn[empIndex] = true;
      status = "Check-IN";
      displayMessage("Welcome,", name, getDateTimeString());
      digitalWrite(ledPins[empIndex], HIGH);
      mp3.play(3); // welcome sound
    } else {
      isCheckedIn[empIndex] = false;
      status = "Check-OUT";
      displayMessage("Goodbye,", name, getDateTimeString());
      digitalWrite(ledPins[empIndex], LOW);
      mp3.play(2); // goodbye sound
    }

    Serial.println("👤 Employee: " + name);
    Serial.println("📍 Status: " + status);
    Serial.println("🕒 Time: " + getDateTimeString());
    Serial.println("-----------------------------------");

    if (enableNetworking) sendLogToServer(employeeUIDs[empIndex], status, name);

  } else {
    displayMessage("Unknown Card", "Access Denied", "");
    Serial.println("❌ Unknown card detected!");
  }

  rfid.PICC_HaltA();
  delay(1500);
}

// ---------- CONNECT TO WIFI ----------
void connectWiFi() {
  displayMessage("Connecting WiFi...", "", "");
  WiFi.begin(ssid, password);
  Serial.print("🌐 Connecting to WiFi");

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected: " + WiFi.localIP().toString());
    displayMessage("WiFi Connected", WiFi.localIP().toString(), "");
  } else {
    Serial.println("\n⚠️ WiFi Connection Failed");
    displayMessage("WiFi Failed", "Offline Mode", "");
  }
}

// ---------- SEND LOG TO SERVER VIA HTTPS ----------
void sendLogToServer(String uid, String status, String name) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ No WiFi. Skipping upload.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();  // ✅ For testing only! Replace with setCACert() for production

  HTTPClient https;
  https.begin(client, serverURL);
  https.addHeader("Content-Type", "application/json");

  String timestamp = getDateTimeString();
  String message = name + " " + status;

  String payload = "{\"uid\":\"" + uid +
                   "\",\"timestamp\":\"" + timestamp +
                   "\",\"status\":\"" + status +
                   "\",\"message\":\"" + message + "\"}";

  Serial.println("📦 Sending Payload: " + payload);

  int httpCode = https.POST(payload);

  if (httpCode > 0) {
    Serial.println("📡 Sent! Server responded: " + String(httpCode));
    String response = https.getString();
    Serial.println("🧾 Response: " + response);
  } else {
    Serial.println("❌ HTTP Error: " + https.errorToString(httpCode));
  }

  https.end();
}

// ---------- TIME HELPERS ----------
String getDateTimeString() {
  bool century = false;
  bool h12Flag, pmFlag;
  char buf[25];
  sprintf(buf, "20%02d-%02d-%02d %02d:%02d:%02d",
          rtc.getYear(),
          rtc.getMonth(century),
          rtc.getDate(),
          rtc.getHour(h12Flag, pmFlag),
          rtc.getMinute(),
          rtc.getSecond());
  return String(buf);
}

// ---------- DISPLAY HELPERS ----------
void displayMessage(String line1, String line2, String line3) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(line1);
  display.setCursor(0, 15);
  display.println(line2);
  display.setCursor(0, 30);
  display.println(line3);
  display.display();
}
