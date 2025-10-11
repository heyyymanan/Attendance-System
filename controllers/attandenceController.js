import { asyncHandler } from "../utils/asyncHandler.js";

let mockLogs = [];

export const logAttendance = asyncHandler(async (req, res) => {
    const { uid, timestamp, status, message } = req.body;

    console.log("📩 Attendance data received:", req.body);

    if (!uid || !timestamp) {
        return res.status(400).json({ success: false, error: "Invalid data" });
    }

    const log = {
        uid,
        timestamp,
        status: status || "offline",
        message: message || "Log received successfully",
    };

    mockLogs.push(log);

    res.status(200).json({
        success: true,
        msg: "Attendance logged successfully!",
        data: log,
    });
});

export const getLogs = asyncHandler(async (req, res) => {


    // console.log("📤 Fetching all logs");
    res.status(200).json({
        success: true,
        count: mockLogs.length,
        data: mockLogs,
    });

});