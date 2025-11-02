import express from 'express'
import {paystackInitialize, verifyPayment, webhook} from '../controllers/pay.controllers.js'
import { protectRoute } from '../middlewares/auth.middleware.js';

const router = express.Router();

console.log("Paystack routes loaded");

// router.post('/paystack-webhook', pay)
// router.post('/orders', pay)
router.post('/paystack/initiate', protectRoute, paystackInitialize)
router.get('/paystack/verify/:reference', (req, res, next) => {
    console.log(`📢 Request received at /paystack/verify: ${req.method} ${req.url}`);
    next(); // Call the next middleware function (verifyPayment)
}, verifyPayment);
router.post('/paystack/webhook', (req, res, next) => {
    console.log(`📢 Request received at /paystack/webhook: ${req.method} ${req.url}`);
    next(); // Call the next middleware function (verifyPayment)
}, webhook)

export default router;