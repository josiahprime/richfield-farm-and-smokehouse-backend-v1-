import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { 
  changeUsername, 
  requestEmailChange,
  verifyEmailChange,
  updatePassword,
  updatePhone,
  updateAddress,
  getUserAddress
} from "../controllers/account.controller.js";


const router = express.Router();

// 🔹 Update Username
router.post("/update-username", protectRoute, changeUsername);

// 🔹 Update Email
router.post("/update-email", protectRoute, requestEmailChange);

// 🔹 verify Email
router.post("/verify-new-email", protectRoute, verifyEmailChange);

// 🔹 Update Password
router.post("/update-password", protectRoute, updatePassword);

//update phone
router.post("/update-phone", protectRoute, updatePhone);

//update address
router.post("/update-address", protectRoute, updateAddress);

router.get("/address", protectRoute, getUserAddress);

export default router;
