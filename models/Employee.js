import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
    timestamp: {
        type: String, // Keeping as string
        required: true,
    },
    status: {
        type: String,
        default: "offline",
    },
    message: {
        type: String,
        default: "Log received successfully",
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
