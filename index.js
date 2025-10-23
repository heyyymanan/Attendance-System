import express from "express";
import cors from "cors";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import mongoConnect from "./utils/mongoConnect.js";
import fs from "fs";
import https from "https";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 1000;

// const options = {
//     key: fs.readFileSync("key.pem"),
//     cert: fs.readFileSync("cert.pem"),
// };

const startServer = async () => {
    try {
        await mongoConnect(); 
        console.log(" MongoDB Connected");

        
        app.use("/api/attendance", attendanceRoutes);

        app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err);
        process.exit(1);
    }
};

startServer();
