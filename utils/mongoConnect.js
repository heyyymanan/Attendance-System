import { config } from "dotenv";
import mongoose from "mongoose";

config({ quiet: true });

const uri = process.env.MONGO_URI;

async function mongoConnect() {
    try {
        await mongoose.connect(uri,{dbName: "attendanceDB"});
        console.log("✅ Successfully connected to MongoDB!");
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        throw err;
    }
}

export default mongoConnect;
