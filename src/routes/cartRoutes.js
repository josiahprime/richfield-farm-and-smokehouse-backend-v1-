import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  mergeCart,
  clearCart,
} from '../controllers/cartController.js';
import { protectRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protectRoute);


router.get('/', getCart);
router.post('/', addToCart);
router.put('/:id', updateCartItem);
router.delete("/clear", clearCart);
router.delete('/:id', deleteCartItem);
router.post('/merge', mergeCart);

export default router;
