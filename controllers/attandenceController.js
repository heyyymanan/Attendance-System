import { asyncHandler } from "../utils/asyncHandler.js";
import Employee from "../models/Employee.js";


export const logAttendance = asyncHandler(async (req, res) => {
    const { uid, timestamp, status, message } = req.body;

    console.log("📩 Attendance data received:", req.body);

    if (!uid || !timestamp) {
        return res.status(400).json({ success: false, error: "Invalid data" });
    }

    // Find employee by UID
    let employee = await Employee.findOne({ uid });

    if (!employee) {
        return res.status(404).json({ success: false, error: "Employee not found" });
    }

    // Add log to employee's logs array
    const newLog = {
        timestamp,
        status: status || "offline",
        message: message || "Log received successfully",
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



export const create = asyncHandler(async (req, res) => {
    const employees = [
        { uid: "B3D07634", name: "Rabil Khan" },
        { uid: "E3935EFS", name: "Manan Vyas" },
        { uid: "EMP003", name: "Charlie" },
        { uid: "EMP004", name: "David" },
        { uid: "EMP005", name: "Eve" },
    ];

    // Only insert employees if they don't exist
    for (const emp of employees) {
        const exists = await Employee.findOne({ uid: emp.uid });
        if (!exists) {
            await Employee.create(emp);
            console.log(`✅ Employee ${emp.name} created`);
        }
    }

    res.status(200).json({ success: true, msg: "Employees created (if not existed)" });
});

