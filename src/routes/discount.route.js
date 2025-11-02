import express from "express";
import {
  getDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from "../controllers/discount.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/roles.middleware.js";

const router = express.Router();

router.get("/", protectRoute, isAdmin, getDiscounts);
router.post("/", protectRoute, isAdmin, createDiscount);
router.patch("/:id", protectRoute, isAdmin, updateDiscount);
router.delete("/:id", protectRoute, isAdmin, deleteDiscount);

export default router;
