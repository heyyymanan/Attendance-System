import dotenv from "dotenv";
dotenv.config();

export const validateESP32Token = (req, res, next) => {
  try {
    const token = req.headers["x-esp32-token"]; // <-- ESP32 must send this header

    if (!token) {
      return res.status(401).json({ success: false, message: "Missing ESP32 token" });
    }

    // Just a simple decryption formula (same logic used in ESP32)
    const secret = process.env.ESP32_SECRET_KEY || "mySecretKey";
    const decoded = decryptToken(token, secret);

    if (decoded !== process.env.ESP32_DEVICE_ID) {
      return res.status(403).json({ success: false, message: "Invalid ESP32 token" });
    }

    next();
  } catch (err) {
    console.error("Token validation error:", err.message);
    return res.status(500).json({ success: false, message: "Token validation failed" });
  }
};

// Simple decrypt function (reverse + shift)
function decryptToken(encrypted, key) {
  if (!encrypted || !key) throw new Error("Invalid input for decryptToken");
  
  let result = "";
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i) - key.length;
    result += String.fromCharCode(charCode);
  }
  return result.split("").reverse().join("");
}
