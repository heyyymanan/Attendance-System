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

    // --- MODIFICATION START ---
    
    let dateObj;

    // The incoming format is 'YYYY-MM-DD HH:MM:SS'
    // We assume this time is ALREADY in 'Asia/Kolkata' (IST)
    // To make new Date() parse it correctly regardless of server timezone,
    // we format it as a full ISO string with the IST offset (+05:30).
    try {
        const isoTimestamp = timestamp.replace(' ', 'T') + '+05:30';
        dateObj = new Date(isoTimestamp);

        if (isNaN(dateObj.getTime())) {
            // Throw an error to be caught by the catch block
            throw new Error("Invalid timestamp format");
        }
    } catch (error) {
        console.warn(` Invalid timestamp received ('${timestamp}'), using current India time instead`);
        dateObj = new Date(); // Fallback to current time
    }

    // --- MODIFICATION END ---


    // This section now works correctly because dateObj is the correct
    // universal moment in time, regardless of the server's local timezone.
    const indiaDate = dateObj.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
    });

    const indiaTime = dateObj.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false, // Use 24-hour format to match incoming data
    });

    const currentDay = dateObj.toLocaleDateString("en-IN", {
        weekday: "long",
        timeZone: "Asia/Kolkata",
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
