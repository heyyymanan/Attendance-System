import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
    date: {
        type: String, 
        required: true,
    },
    time: {
        type: String, 
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
}, { _id: false }); 

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
    salary: {
        type: Number,
        required: true,
    },
    logs: [logSchema], 
}, {
    timestamps: true,
});

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
