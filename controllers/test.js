import Employee from "../models/Employee.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const create = asyncHandler(async (req, res) => {
    const employees = [
        { uid: "B3D07634", name: "Rabil Khan" },
        { uid: "E3935EFS", name: "Manan Vyas" },
        { uid: "EMP003", name: "Charlie" },
        { uid: "EMP004", name: "David" },
        { uid: "EMP005", name: "Eve" },
    ];

 
    for (const emp of employees) {
        const exists = await Employee.findOne({ uid: emp.uid });
        if (!exists) {
            await Employee.create(emp);
            console.log(`✅ Employee ${emp.name} created`);
        }
    }

    res.status(200).json({ success: true, msg: "Employees created (if not existed)" });
});
