import express from "express";
import {  getEmployeeLogsController, getLogs, logAttendance, updateEmployeeLogsByDateController } from "../controllers/attandenceController.js";
import { validateESP32Token } from "../middleware/decrypter.middleware.js";
import { downloadMonthlyAttendanceReport } from "../controllers/excelReport.controller..js";
import { getAllEmployeesController, updateEmployeeByUidController } from "../controllers/employee.controller.js";


const router = express.Router();

router.post("/log",validateESP32Token, logAttendance);

router.get("/logs",validateESP32Token, getLogs);

router.get("/report", downloadMonthlyAttendanceReport);

// ✅ Get all employees
router.get("/employees", getAllEmployeesController);

// ✅ Update employee by UID
router.put("/employees/:uid", updateEmployeeByUidController);

// Fetch logs
router.get("/employees/:uid/logs", getEmployeeLogsController);

// Update logs of a specific date
router.put("/employees/:uid/logs", updateEmployeeLogsByDateController);


export default router;

