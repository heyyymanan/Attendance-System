/****************************************************
 * ESP32 RFID Attendance System (Offline + Online Ready)
 * Features:
 * RFID Attendance (5 Employees)
 * OLED Display (I2C)
 * RTC (DS3231)
 * DFPlayer Audio Feedback
 * LED indicators
 * Reliable online logging with retry
 * Offline log queue with automatic resend
 * Exact scan timestamps preserved
 * Secure Token Auth (Custom XOR-based) - FIXED
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
#include <DS3231.h>
#include <SPIFFS.h>

// ---------- USER CONFIG ----------
bool enableNetworking = true;
const char* ssid = "****";
const char* password = "****";
String serverURL = "https://attendanceendpoint.co.in/api/attendance/log";

// ---------- AUTH SETTINGS ----------
String espSecret = "***";
String serverSecret = "***";

String generateToken() {
  String token = "";
  token.reserve(espSecret.length() * 2);
  for (int i = 0; i < (int)espSecret.length(); i++) {
    uint8_t a = (uint8_t)espSecret[i];
    uint8_t b = (uint8_t)serverSecret[i % serverSecret.length()];
    uint8_t x = a ^ b;

    char hexbuf[3];
    snprintf(hexbuf, sizeof(hexbuf), "%02x", x);
    token += String(hexbuf);
  }
  return token;
}

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
bool h12Flag;
bool pmFlag;

// ---------- LED SETTINGS ----------
int ledPins[5] = {32, 33, 25, 26, 27};

// ---------- EMPLOYEE DATABASE ----------
String employeeUIDs[5] = {
  "B3 D0 76 34", "E3 93 5E F5", "11 22 33 44", "55 66 77 88", "AA BB CC DD"
};
String employeeNames[5] = {
  "EMP01", "EMP02", "EMP03", "EMP04", "EMP05"
};
bool isCheckedIn[5] = {false,false,false,false,false};

// ---------- FUNCTION DECLARATIONS ----------
int getEmployeeIndex(String UID);
void handleAttendance(int empIndex, String uid);
void displayMessage(String line1, String line2, String line3);
String getDateTimeString();
void connectWiFi();
bool sendLogToServer(String uid, String name, String status, String timestamp);
bool sendLogWithRetry(String uid, String name, String status, String timestamp, int retries);
void storeLogOffline(String uid, String name, String status, String timestamp);
void sendOfflineLogs();

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  SPI.begin();
  Wire.begin(5, 4); // SDA=5, SCL=4
  Wire.setClock(100000);

  if(!SPIFFS.begin(true)) Serial.println("SPIFFS Mount Failed");

  for(int i=0;i<5;i++){
    pinMode(ledPins[i],OUTPUT);
    digitalWrite(ledPins[i],LOW);
  }

  if(!display.begin(SSD1306_SWITCHCAPVCC,0x3C)){
    Serial.println("OLED init failed!");
    for(;;);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0,0);
  display.println("Initializing System...");
  display.display();

  rfid.PCD_Init();
  Serial.println("RFID Ready");

  mp3Serial.begin(9600,SERIAL_8N1,16,17);
  if(!mp3.begin(mp3Serial)){
    Serial.println("DFPlayer not found!");
    displayMessage("DFPlayer Error","Check Wiring","");
  } else {
    Serial.println("DFPlayer Ready");
    mp3.volume(25);
  }

  Serial.println("RTC Ready");

  if(enableNetworking) connectWiFi();

  delay(1000);
  displayMessage("RFID Attendance","System Ready","");
  Serial.println("System Ready!");

  if(enableNetworking) sendOfflineLogs();
}

// ---------- MAIN LOOP ----------
void loop() {
  if(rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()){
    String UID = "";
    for(byte i=0;i<rfid.uid.size;i++){
      UID += String(rfid.uid.uidByte[i]<0x10?"0":"");
      UID += String(rfid.uid.uidByte[i],HEX);
      if(i != rfid.uid.size-1) UID += " ";
    }
    UID.toUpperCase();

    int empIndex = getEmployeeIndex(UID);
    if(empIndex!=-1) handleAttendance(empIndex,UID);
    else {
      displayMessage("Unknown Card","Access Denied","");
      Serial.println("Unknown card detected!");
    }

    rfid.PICC_HaltA();
    delay(1500);
  }

  static unsigned long lastRetry = 0;
  if(enableNetworking && WiFi.status()==WL_CONNECTED){
    if(millis()-lastRetry>5000){
      sendOfflineLogs();
      lastRetry = millis();
    }
  }
}

// ---------- FUNCTIONS ----------
int getEmployeeIndex(String UID){
  for(int i=0;iG<5;i++) if(UID==employeeUIDs[i]) return i;
  return -1;
}

void handleAttendance(int empIndex, String uid){
  String name = employeeNames[empIndex];
  String currentTime = getDateTimeString();
  String status;

  if(!isCheckedIn[empIndex]){
    isCheckedIn[empIndex]=true;
    status="Check-IN";
    displayMessage("Welcome,",name,currentTime);
    digitalWrite(ledPins[empIndex],HIGH);
    mp3.play(1);
  } else {
    isCheckedIn[empIndex]=false;
    status="Check-OUT";
    displayMessage("Goodbye,",name,currentTime);
    digitalWrite(ledPins[empIndex],LOW);
    mp3.play(2);
  }

  Serial.println("-----------------------------------");
  Serial.println("UID: "+uid);
  Serial.println("Employee: "+name);
  Serial.println("Time: "+currentTime);
  Serial.println("Status: "+status);
  Serial.println("-----------------------------------");

  if(enableNetworking){
    sendOfflineLogs();

    bool success = sendLogWithRetry(uid,name,status,currentTime,3);
    if(!success) storeLogOffline(uid,name,status,currentTime);
  }
}

// ---------------- NETWORK ----------------
void connectWiFi(){
  displayMessage("Connecting WiFi...","","");
  WiFi.begin(ssid,password);
  Serial.print("Connecting to WiFi");
  int retry=0;
  while(WiFi.status()!=WL_CONNECTED && retry<15){
    delay(500); Serial.print(".");
    retry++;
  }
  if(WiFi.status()==WL_CONNECTED){
    Serial.println("\nWiFi Connected: "+WiFi.localIP().toString());
    displayMessage("WiFi Connected",WiFi.localIP().toString(),"");
  } else {
    Serial.println("\nWiFi Connection Failed");
    displayMessage("WiFi Failed","Offline Mode","");
  }
}

bool sendLogWithRetry(String uid,String name,String status,String timestamp,int retries){
  for(int i=0;i<retries;i++){
    if(sendLogToServer(uid,name,status,timestamp)) return true;
    delay(500);
    Serial.println("Retrying log...");
  }
  return false;
}

bool sendLogToServer(String uid,String name,String status,String timestamp){
  if(WiFi.status()!=WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type","application/json");

  String token = generateToken();
  Serial.println("[Auth] Generated token: " + token);

  // Missing http.addHeader("x-esp32-token", token);

  http.setTimeout(5000);

  String payload = "{";
  payload += "\"uid\":\""+uid+"\",";
  payload += "\"timestamp\":\""+timestamp+"\",";
  payload += "\"status\":\""+status+"\",";
  payload += "\"message\":\""+name+" "+status+"\"";
  payload += "}";

  int httpCode = http.POST(payload);
  http.end();

  if(httpCode>0 && httpCode==200){
    Serial.println("Log sent successfully");
    return true;
  } else {
    Serial.println("Failed to send log: "+String(httpCode));
    return false;
  }
}

// ---------------- OFFLINE LOG QUEUE ----------------
void storeLogOffline(String uid,String name,String status,String timestamp){
  String payload = uid+"|"+timestamp+"|"+status+"|"+name+" "+status+"\n";

  File file = SPIFFS.open("/logs.txt", FILE_APPEND);
  if(file){
    file.print(payload);
    file.close();
    Serial.println("Log saved offline: " + timestamp);
  } else {
    Serial.println("Failed to save log offline");
  }
}

void sendOfflineLogs(){
  File file = SPIFFS.open("/logs.txt",FILE_READ);
  if(!file) return;

  String remainingLogs="";
  Serial.println("Sending offline logs...");

  while(file.available()){
    String line = file.readStringUntil('\n');
    if(line.length()<5) continue;

    int idx1=line.indexOf('|');
    int idx2=line.indexOf('|',idx1+1);
    int idx3=line.indexOf('|',idx2+1);

    String uid=line.substring(0,idx1);
    String timestamp=line.substring(idx1+1,idx2);
    String status=line.substring(idx2+1,idx3);
    String message=line.substring(idx3+1);

    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type","application/json");

    String token = generateToken();
    Serial.println("[Auth] Offline token: " + token);
    http.addHeader("x-esp32-token", token);

    http.setTimeout(5000);

    String payload="{";
    payload += "\"uid\":\""+uid+"\",";
    payload += "\"timestamp\":\""+timestamp+"\",";
    payload += "\"status\":\""+status+"\",";
    payload += "\"message\":\""+message+"\"";
    payload += "}";

    int code = http.POST(payload);
    http.end();

    if(code==200){
      Serial.println("Offline log sent: "+message);
      delay(100);
    } else {
      Serial.println("Offline log failed: "+message);
      remainingLogs += line+"\n";
    }
  }
  file.close();

  File f = SPIFFS.open("/logs.txt", FILE_WRITE);
  if(f){ f.print(remainingLogs); f.close(); }
}

// ---------------- DISPLAY ----------------
void displayMessage(String line1,String line2,String line3){
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0,0);
  display.println(line1);
  display.setCursor(0,15);
  display.println(line2);
  display.setCursor(0,30);
  display.println(line3);
  display.display();
}

// ---------------- RTC ----------------
String getDateTimeString(){
  bool century = false;
  byte year = rtc.getYear();
  byte month = rtc.getMonth(century);
  byte day = rtc.getDate();
  byte hour = rtc.getHour(h12Flag,pmFlag);
  byte minute = rtc.getMinute();
  byte second = rtc.getSecond();

  char buf[20];
  sprintf(buf,"%04d-%02d-%02d %02d:%02d:%02d",2000+year,month,day,hour,minute,second);
  return String(buf);
}