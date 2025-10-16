import dotenv from "dotenv";
dotenv.config();

export const validateESP32Token = (req, res, next) => {
  try {
    console.log("🔒 [Middleware] Validating ESP32 token...");

    const token = req.headers["x-esp32-token"];
    if (!token) {
      console.log("❌ [Middleware] Missing token in request headers.");
      return res.status(401).json({ success: false, message: "Missing ESP32 token" });
    }

    const secret = process.env.ESP32_SECRET_KEY || "mySecretKey";
    console.log("🧩 [Middleware] Using secret key length:", secret.length);
    console.log("📦 [Middleware] Received token:", token);

    // Try to decrypt
    const decoded = decryptToken(token, secret);
    console.log("🔓 [Middleware] Decrypted token:", decoded);

    const expected = process.env.ESP32_DEVICE_ID;
    console.log("🎯 [Middleware] Expected device ID:", expected);

    if (decoded !== expected) {
      console.log("🚫 [Middleware] Invalid ESP32 token — mismatch detected!");
      return res.status(403).json({ success: false, message: "Invalid ESP32 token" });
    }

    console.log("✅ [Middleware] Token validation successful. Proceeding to next middleware...");
    next();
  } catch (err) {
    console.error("💥 [Middleware Error] Token validation failed:", err.message);
    return res.status(500).json({ success: false, message: "Token validation failed" });
  }
};

// Simple reversible decryption formula
function decryptToken(encrypted, key) {
  if (!encrypted || !key) {
    console.error("⚠️ [Decryptor] Missing input data:", { encrypted, key });
    throw new Error("Invalid input for decryptToken");
  }

  console.log("🔧 [Decryptor] Starting decryption...");
  let result = "";
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i) - key.length;
    result += String.fromCharCode(charCode);
  }

  const finalDecoded = result.split("").reverse().join("");
  console.log("🧠 [Decryptor] Decryption complete:", finalDecoded);
  return finalDecoded;
}
