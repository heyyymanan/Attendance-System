import express from "express";
import { getLogs, logAttendance } from "../controllers/attandenceController.js";
import { create } from "../controllers/test.js";


const router = express.Router();

// POST - Receive attendance data
router.post("/log", logAttendance);

// GET - Mock fetch all logs
router.get("/logs", getLogs);

router.post("/create", create);

export default router;

