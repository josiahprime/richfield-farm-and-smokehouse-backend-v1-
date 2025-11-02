import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  getReviews,
  addReview,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";

const router = express.Router();

router.get("/:productId", getReviews); // public
router.post("/", protectRoute, addReview);
router.put("/:id", protectRoute, updateReview);
router.delete("/:id", protectRoute, deleteReview);

export default router;
