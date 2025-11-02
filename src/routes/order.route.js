import express from 'express';
import { isAdmin } from '../middlewares/roles.middleware.js';
import { getAllOrders, getMyOrders, previewOrder, updateOrderStatus } from '../controllers/order.controllers.js';
import { protectRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/get-orders', protectRoute, isAdmin, getAllOrders);

router.post('/preview', protectRoute, previewOrder)

router.get('/my', protectRoute, getMyOrders)

router.put('/:id', protectRoute, isAdmin, updateOrderStatus)

export default router;
