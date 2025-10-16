import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
    date: {
        type: String, // e.g., "2025-10-16"
        required: true,
    },
    time: {
        type: String, // e.g., "04:35:22 PM"
        required: true,
    },
    status: {
        type: String,
        default: "offline",
    },
    day: {
        type: String,
        default: "Day Not Fetched",
    },
}, { _id: false }); // no separate _id for logs

const employeeSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    logs: [logSchema], // array of logs
}, {
    timestamps: true,
});

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
