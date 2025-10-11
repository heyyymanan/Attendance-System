import express from "express";
import {  getLogs, logAttendance } from "../controllers/attandenceController.js";


const router = express.Router();

// POST - Receive attendance data
router.post("/log", logAttendance);

// GET - Mock fetch all logs
router.get("/logs", getLogs);

// router.post("/create", createEmployees);

export default router;

