import { asyncHandler } from "../utils/asyncHandler.js";
import Employee from "../models/Employee.js";

const normalizeUid = (uid) => uid.replace(/\s+/g, "").toUpperCase();

export const logAttendance = asyncHandler(async (req, res) => {
    let { uid, timestamp, status, message } = req.body;

    if (!uid || !timestamp) {
        return res.status(400).json({ success: false, error: "Invalid data" });
    }

    uid = normalizeUid(uid);
    console.log(" Attendance data received:", { uid, timestamp, status, message });

    const employee = await Employee.findOne({ uid });

    if (!employee) {
        return res.status(404).json({ success: false, error: "Employee not found" });
    }

    let dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) {
        console.warn(" Invalid timestamp received, using current India time instead");
        dateObj = new Date();
    }

    const indiaDate = dateObj.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    const indiaTime = dateObj.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
    const currentDay = dateObj.toLocaleDateString("en-IN", {
        weekday: "long",
        timeZone: "Asia/Kolkata"
    });

    const newLog = {
        date: indiaDate,
        time: indiaTime,
        status: status || "offline",
        day: currentDay,
    };

    employee.logs.push(newLog);
    await employee.save();

    res.status(200).json({
        success: true,
        msg: "Attendance logged successfully!",
        data: newLog,
    });
});


export const getLogs = asyncHandler(async (req, res) => {
    const employees = await Employee.find();

    res.status(200).json({
        success: true,
        count: employees.length,
        data: employees,
    });
});
