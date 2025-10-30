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

    try {
        const isoTimestamp = timestamp.replace(' ', 'T') + '+05:30';
        dateObj = new Date(isoTimestamp);

        if (isNaN(dateObj.getTime())) {
            throw new Error("Invalid timestamp format");
        }
    } catch (error) {
        console.warn(` Invalid timestamp received ('${timestamp}'), using current India time instead`);
        dateObj = new Date(); 
    }

    // --- FIX WAS HERE ---
    const indiaDate = dateObj.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata", // Corrected: Was "Asia/KKolkata"
    });

    // --- AND HERE ---
    const indiaTime = dateObj.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", // Corrected: Was "Asia/KKolkata"
        hour12: true, 
    });

    // --- AND HERE ---
    const currentDay = dateObj.toLocaleDateString("en-IN", {
        weekday: "long",
        timeZone: "Asia/Kolkata", // Corrected: Was "Asia/KKolkata"
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
