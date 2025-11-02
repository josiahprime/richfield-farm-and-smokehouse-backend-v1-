import express from 'express';
import { protectRoute } from '../middlewares/auth.middleware.js';
import { isAdmin} from "../middlewares/roles.middleware.js";
import {
  getAllUsers,
  getCurrentUser,
  updateUserRole,
} from '../controllers/user.controllers.js';

const router = express.Router();

// GET all users
router.get('/fetch-users', protectRoute, getAllUsers);

router.get('/current-user', protectRoute, getCurrentUser)

// PATCH: update a user's role (admin, moderator, user, etc.)
router.patch('/:id/role', protectRoute, isAdmin, updateUserRole);



export default router;
