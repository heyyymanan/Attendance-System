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

    let dateObj;

    // The incoming format is 'YYYY-MM-DD HH:MM:SS'
    // We assume this time is ALREADY in 'Asia/Kolkata' (IST)
    try {
        const isoTimestamp = timestamp.replace(' ', 'T') + '+05:30';
        dateObj = new Date(isoTimestamp);

        if (isNaN(dateObj.getTime())) {
            throw new Error("Invalid timestamp format");
        }
    } catch (error) {
        console.warn(` Invalid timestamp received ('${timestamp}'), using current India time instead`);
        dateObj = new Date(); // Fallback to current time
    }

    const indiaDate = dateObj.toLocaleDateString("en-IN", {
        timeZone: "Asia/KKolkata",
    });

    // --- THIS IS THE MODIFIED LINE ---
    const indiaTime = dateObj.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true, // Use 12-hour format with am/pm
    });
    // --- END OF MODIFICATION ---

    const currentDay = dateObj.toLocaleDateString("en-IN", {
        weekday: "long",
        timeZone: "Asia/Kolkata",
    });

    const newLog = {
        date: indiaDate,
        time: indiaTime, // This will now be in "h:mm:ss am/pm" format
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
