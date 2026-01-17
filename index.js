import express from "express";
import cors from "cors";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import mongoConnect from "./utils/mongoConnect.js";
import fs from "fs";
import https from "https";

const app = express();

const allowedOrigins = [
  'https://admins.bynatablet.in',
  'https://localhost:3001',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true
}));


app.use(express.json());

const PORT = 1000;


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
