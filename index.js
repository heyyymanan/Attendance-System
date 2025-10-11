import express from "express";
import cors from "cors";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import mongoConnect from "./utils/mongoConnect.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 1000;

const options = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
};

const startServer = async () => {
    try {
        await mongoConnect(); // wait for DB connection
        console.log("✅ MongoDB Connected");

        // Register routes AFTER DB is ready
        app.use("/api/attendance", attendanceRoutes);

        https.createServer(options, app).listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err);
        process.exit(1);
    }
};

startServer();
