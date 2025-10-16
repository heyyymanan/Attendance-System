// verifyEspMiddleware.js
import dotenv from "dotenv";
dotenv.config();

const SECRET_KEY = process.env.ESP_SECRET_KEY;
const DEVICE_ID = process.env.ESP_DEVICE_ID;

// ----------------- Decryption Logic (XOR + Hex Decode) -----------------
function decryptToken(token, key) {
  let decrypted = "";
  for (let i = 0; i < token.length; i += 2) {
    const hexPair = token.substring(i, i + 2);
    const byte = parseInt(hexPair, 16);
    const keyChar = key.charCodeAt((i / 2) % key.length);
    decrypted += String.fromCharCode(byte ^ keyChar);
  }
  return decrypted;
}

// ----------------- Middleware -----------------
export function validateESP32Token(req, res, next) {
  try {
    const token = req.headers["x-esp32-token"];
    if (!token) {
      console.log("🚫 [Middleware] No token found in header!");
      return res.status(401).json({ success: false, message: "ESP token missing" });
    }


    const decrypted = decryptToken(token, SECRET_KEY);


    if (decrypted !== DEVICE_ID) {
      console.log("🚫 [Middleware] Invalid ESP32 token — mismatch detected!");
      return res.status(403).json({ success: false, message: "Invalid ESP32 token" });
    }

    console.log("✅ [Middleware] ESP32 token verified successfully!");
    next();
  } catch (error) {
    console.error("💥 [Middleware] Verification error:", error.message);
    return res.status(500).json({ success: false, message: "ESP verification failed" });
  }
}
