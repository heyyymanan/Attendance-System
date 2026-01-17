import { asyncHandler } from "../utils/asyncHandler.js";
import Employee from "../models/Employee.js";
const normalizeUid = (uid) => uid.replace(/\s+/g, "").toUpperCase();

// ✅ Accept flexible date formats and convert to dd/mm/yyyy
function normalizeToDDMMYYYY(input) {
    if (!input) return null;

    const str = String(input).trim();

    // Case 1: already dd/mm/yyyy or dd-m-yyy
    const dmY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmY) {
        const dd = String(dmY[1]).padStart(2, "0");
        const mm = String(dmY[2]).padStart(2, "0");
        const yyyy = dmY[3];

        return `${dd}/${mm}/${yyyy}`;
    }

    // Case 2: ISO yyyy-mm-dd or yyyy/mm/dd
    const iso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (iso) {
        const yyyy = iso[1];
        const mm = String(iso[2]).padStart(2, "0");
        const dd = String(iso[3]).padStart(2, "0");

        return `${dd}/${mm}/${yyyy}`;
    }

    return null;
}


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

export const getEmployeeLogsController = async (req, res) => {
    try {
        const { uid } = req.params;
        const { day, month, year } = req.query;

        if (!uid) {
            return res.status(400).json({ message: "Employee UID is required" });
        }

        const employee = await Employee.findOne(
            { uid },
            { uid: 1, name: 1, salary: 1, logs: 1, _id: 0 }
        ).lean();

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        let logs = employee.logs || [];

        // ✅ Filter if day/month/year provided
        // Log date format in DB: "dd/mm/yyyy"
        const d = day ? Number(day) : null;
        const m = month ? Number(month) : null;
        const y = year ? Number(year) : null;

        if (
            (d && (d < 1 || d > 31)) ||
            (m && (m < 1 || m > 12)) ||
            (y && (y < 2000 || y > 2100))
        ) {
            return res.status(400).json({ message: "Invalid day/month/year filter" });
        }

        if (d || m || y) {
            logs = logs.filter((log) => {
                const [dd, mm, yyyy] = String(log.date || "").split("/").map(Number);
                if (!dd || !mm || !yyyy) return false;

                if (d && dd !== d) return false;
                if (m && mm !== m) return false;
                if (y && yyyy !== y) return false;

                return true;
            });
        }

        // ✅ Sort by date + time
        logs.sort((a, b) => {
            // date: dd/mm/yyyy
            const [ad, am, ay] = String(a.date).split("/").map(Number);
            const [bd, bm, by] = String(b.date).split("/").map(Number);

            const da = new Date(ay, am - 1, ad).getTime();
            const db = new Date(by, bm - 1, bd).getTime();
            if (da !== db) return da - db;

            // fallback string time sort
            return String(a.time).localeCompare(String(b.time));
        });

        return res.status(200).json({
            employee: {
                uid: employee.uid,
                name: employee.name,
                salary: employee.salary,
            },
            totalLogs: logs.length,
            logs,
        });
    } catch (error) {
        console.error("getEmployeeLogsController error:", error);
        return res.status(500).json({ message: "Failed to fetch employee logs" });
    }
};


export const updateEmployeeLogsByDateController = async (req, res) => {
    try {
        const { uid } = req.params;
        const { date, logs } = req.body;

        if (!uid) {
            return res.status(400).json({ message: "Employee UID is required" });
        }

        if (!date || typeof date !== "string") {
            return res.status(400).json({ message: "date is required in dd/mm/yyyy format" });
        }

        // ✅ validate date dd/mm/yyyy
        const normalizedDate = normalizeToDDMMYYYY(date);

        if (!normalizedDate) {
            return res.status(400).json({
                message: "Invalid date format. Use dd/mm/yyyy (example: 17/01/2026)",
            });
        }


        if (!Array.isArray(logs)) {
            return res.status(400).json({ message: "logs must be an array" });
        }

        // ✅ Validate each log
        for (const l of logs) {
            if (!l.time || !l.status) {
                return res.status(400).json({
                    message: "Each log must have time and status",
                });
            }

            const validStatus = ["Check-IN", "Check-OUT"];
            if (!validStatus.includes(l.status)) {
                return res.status(400).json({
                    message: `Invalid status '${l.status}'. Must be Check-IN or Check-OUT.`,
                });
            }
        }

        const employee = await Employee.findOne({ uid });
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // ✅ Remove old logs of this date
        employee.logs = (employee.logs || []).filter((l) => l.date !== date);

        // ✅ Insert new logs with same date
        const newLogs = logs.map((l) => ({
            date,
            time: String(l.time).trim(),
            status: l.status,
            day: l.day || "Day Not Fetched",
        }));

        employee.logs.push(...newLogs);

        await employee.save();

        return res.status(200).json({
            message: "Logs updated successfully for the day",
            date,
            updatedCount: newLogs.length,
        });
    } catch (error) {
        console.error("updateEmployeeLogsByDateController error:", error);
        return res.status(500).json({ message: "Failed to update logs" });
    }
};