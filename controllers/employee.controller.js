import Employee from "../models/Employee.js";

// ✅ GET: Fetch all employees (for admin panel listing)
export const getAllEmployeesController = async (req, res) => {
  try {
    const employees = await Employee.find(
      {},
      { uid: 1, name: 1, salary: 1, _id: 0 }
    ).sort({ name: 1 });

    return res.status(200).json(employees);
  } catch (error) {
    console.error("getAllEmployeesController error:", error);
    return res.status(500).json({ message: "Failed to fetch employees" });
  }
};

// ✅ PUT: Update employee by UID (name & salary)
export const updateEmployeeByUidController = async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, salary } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "Employee UID is required" });
    }

    // ✅ Validate name
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "Employee name is required" });
    }

    // ✅ Validate salary
    const salaryNum = Number(salary);
    if (!Number.isFinite(salaryNum) || salaryNum <= 0) {
      return res
        .status(400)
        .json({ message: "Salary must be a valid positive number" });
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      { uid },
      { $set: { name: trimmedName, salary: salaryNum } },
      { new: true, projection: { uid: 1, name: 1, salary: 1, _id: 0 } }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("updateEmployeeByUidController error:", error);
    return res.status(500).json({ message: "Failed to update employee" });
  }
};
