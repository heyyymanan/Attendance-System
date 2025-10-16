import express from "express";
import {  getLogs, logAttendance } from "../controllers/attandenceController.js";
import { validateESP32Token } from "../controllers/middleware/decrypter.middleware.js";


const router = express.Router();

// POST - Receive attendance data
router.post("/log",validateESP32Token, logAttendance);

// GET - Mock fetch all logs
router.get("/logs",validateESP32Token, getLogs);

// router.post("/create", createEmployees);

export default router;

