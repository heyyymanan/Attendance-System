import express from "express";
import cors from "cors";
import attendanceRoutes from "./routes/attendanceRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/attendance", attendanceRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
