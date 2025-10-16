// authMiddleware.js
export const validateESP32Token = (req, res, next) => {
  const token = req.headers["x-esp32-token"];
  if (!token) return res.status(401).json({ error: "Token missing" });

  const espSecret = process.env.ESP32_PASSWORD;
  const serverSecret = process.env.SERVER_SECRET;

  let expectedToken = "";
  for (let i = 0; i < espSecret.length; i++) {
    const c = espSecret.charCodeAt(i) ^ serverSecret.charCodeAt(i % serverSecret.length);
    if (c < 0x10) expectedToken += "0";
    expectedToken += c.toString(16);
  }

  if (token !== expectedToken) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
};
