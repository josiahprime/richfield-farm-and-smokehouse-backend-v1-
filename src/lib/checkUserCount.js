import dotenv from "dotenv";
import User from "../models/user.model.js"; 

dotenv.config();

const checkUserCount = async () => {
  try {
    const userCount = await User.countDocuments();
    console.log(`Total users: ${userCount}`);
    return userCount;
  } catch (error) {
    console.error("Error counting users:", error);
    return 0;
  }
};

// Call this function inside an API route or initialization function
export default checkUserCount;
