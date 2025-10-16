import { asyncHandler } from "../utils/asyncHandler.js";
import Employee from "../models/Employee.js";

// Utility to normalize UID (remove spaces and make uppercase for consistency)
const normalizeUid = (uid) => uid.replace(/\s+/g, "").toUpperCase();

export const logAttendance = asyncHandler(async (req, res) => {
    let { uid, timestamp, status, message } = req.body;

    if (!uid || !timestamp) {
        return res.status(400).json({ success: false, error: "Invalid data" });
    }

    uid = normalizeUid(uid);
    console.log("📩 Attendance data received:", { uid, timestamp, status, message });

    const employee = await Employee.findOne({ uid });

    if (!employee) {
        return res.status(404).json({ success: false, error: "Employee not found" });
    }

    // Convert timestamp safely
    let dateObj = new Date(timestamp);
    if (isNaN(dateObj.getTime())) {
        console.warn("⚠️ Invalid timestamp received, using current India time instead");
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

// export const createEmployees = asyncHandler(async (req, res) => {
//     const employees = [
//         { uid: "B3D07634", name: "Rabil Khan" },
//         { uid: "E3935EFS", name: "Manan Vyas" },
//         { uid: "EMP003", name: "Charlie" },
//         { uid: "EMP004", name: "David" },
//         { uid: "EMP005", name: "Eve" },
//     ];

//     for (const emp of employees) {
//         const exists = await Employee.findOne({ uid: normalizeUid(emp.uid) });
//         if (!exists) {
//             await Employee.create({
//                 ...emp,
//                 uid: normalizeUid(emp.uid)
//             });
//             console.log(`✅ Employee ${emp.name} created`);
//         }
//     }

//     res.status(200).json({ success: true, msg: "Employees created (if not existed)" });
// });
