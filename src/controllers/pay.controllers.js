import crypto from "crypto";
import Joi from "joi";
import {generateTrackingID} from '../lib/trackingId.js'
import { paystackInitSchema } from "../validations/paystackInitValidation.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import https from 'https'
import { prisma } from "../lib/prisma.js";
import dotenv from "dotenv";


dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set in environment variables.");
}



export const paystackInitialize = async (req, res) => {
  console.log("📢 Incoming request to Paystack initialize:", JSON.stringify(req.body, null, 2));

  const { error } = paystackInitSchema.validate(req.body);
  if (error) {
    console.error("❌ Joi Validation Error:", error.details);
    return res.status(400).json({ message: "Validation failed", details: error.details });
  }

  const {
    name, email, phone, address, state, city, postalCode,
    landmark, extraInstructions, pickupStation, deliveryType, items,
  } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch product prices in one go
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, productName: true, images: true, priceInKobo: true },
    });


    let subtotal = 0;

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      let price = product.priceInKobo;

      // 🏷️ If item has a discountId, validate and apply
      if (item.discountId) {
        const discount = await prisma.discount.findUnique({
          where: { id: item.discountId },
        });

        if (discount) {
          const now = new Date();
          const withinDate =
            (!discount.startDate || now >= discount.startDate) &&
            (!discount.endDate || now <= discount.endDate);

          if (discount.isActive && withinDate) {
            if (discount.type === "PERCENTAGE") {
              const discountAmount = (price * discount.value) / 100;
              price -= discountAmount;
              console.log(
                `💸 Applied ${discount.value}% discount: -₦${discountAmount} on ${item.productId}`
              );
            } else if (discount.type === "FIXED") {
              const discountAmount = discount.value;
              price -= discountAmount;
              console.log(
                `💸 Applied fixed discount: -₦${discountAmount} on ${item.productId}`
              );
            }

            // Prevent negative prices
            if (price < 0) price = 0;
          } else {
            console.log(`⚠️ Discount ${item.discountId} is inactive or expired`);
          }
        } else {
          console.log(`⚠️ Discount not found for id: ${item.discountId}`);
        }
      }

      subtotal += price * item.quantity;
      console.log(`🛍 Product ${item.productId}: ₦${price} x ${item.quantity}`);
    }

    console.log("Subtotal (after discounts):", subtotal);

    // 🧮 Tax calculation
    const taxRate = 0.075;
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    console.log("Tax amount:", taxAmount);

    // 🚚 Shipping
    let shippingFee = 0;
    if (deliveryType === "home") {
      let shippingRate = await prisma.shippingRate.findFirst({ where: { state, city } });
      if (!shippingRate) {
        shippingRate = await prisma.shippingRate.findFirst({ where: { state, city: "default" } });
      }
      shippingFee = subtotal > 50000 ? 0 : (shippingRate?.fee || 3500);
      console.log("Shipping fee:", shippingFee);
    }

    // 💰 Final total
    const total = subtotal + taxAmount + shippingFee;
    const amount = total;
    console.log("🧾 Final total before sending to Paystack:", total);

    // ✅ 7. Generate refs
    const tx_ref = `TX-${Date.now()}`;
    const trackingId = `TRK-${Math.random().toString(36).substring(2, 15)}`;
    const fullAddress = [address, landmark, city, state, postalCode]
    .filter(Boolean)
    .join(", ");

    // const fullAddress = `${address}, ${
    //   landmark ? landmark + "," : ""
    // } ${city}, ${state}, ${postalCode}`;

     // ✅ 8. Save order
    await prisma.order.create({
      data: {
        userId: user.id,
        tx_ref,
        trackingId,
        name,
        email,
        phone,
        address: fullAddress,
        state,
        city,
        postalCode,
        landmark,
        pickupStation,
        extraInstructions,
        amount,
        subtotal,
        taxAmount,
        taxRate,
        shippingFee,
        deliveryType,
        total,
        items: items.map(i => {
        const product = products.find(p => p.id === i.productId);
          return {
            productId: i.productId,
            productName: product?.productName || "Unknown Product",
            image: Array.isArray(product?.images) ? product.images[0] : product?.images,
            priceInKobo: product?.priceInKobo || 0,
            quantity: i.quantity,
            discountId: i.discountId || null,
          };
        }),

        status: "pending",
      },
    });

    const params = JSON.stringify({
      email,
      amount: Math.round(total * 100),
      reference: tx_ref,
      callback_url: `${process.env.FRONTEND_URL}/cart/checkout/payment-verification`,
      metadata: {
        userId: user.id,
        orderRef: tx_ref,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          discountId: i.discountId || null,
          unitType: i.unitType
        })),
        deliveryType,
        referrer: process.env.FRONTEND_URL,
      },
    });


    console.log("💰 Paystack payload:", params);
    // Then continue with your Paystack request logic...
    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const paystackReq = https.request(options, (paystackRes) => {
      let data = "";
      paystackRes.on("data", (chunk) => (data += chunk));
      paystackRes.on("end", () => res.json(JSON.parse(data)));
    });

    paystackReq.on("error", (err) => {
      console.error("Paystack init error:", err);
      res.status(500).json({ error: "Payment initialization failed" });
    });

    paystackReq.write(params);
    paystackReq.end();
    
    
  } catch (error) {
    console.error("💥 Error in paystackInitialize:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




export const verifyPayment = async (req, res) => {
  const { reference } = req.params;
  console.log(reference)

  try {
    const order = await prisma.order.findUnique({
      where: { tx_ref: reference },
    });

    console.log(order)

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    

    return res.json({
      status: order.status,
      message: `Order status is ${order.status}`,
      reference,
    });
    
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




export const webhook = async (req, res) => {
  const payload = req.body;
  console.log("📩 Payload from webhook:", payload);

  const paystackSignature = req.headers["x-paystack-signature"]?.toLowerCase();

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest("hex");

  if (hash !== paystackSignature) {
    console.error("❌ Invalid signature");
    return res.status(400).json({ message: "Invalid signature" });
  }

  try {
    const { reference, status, metadata } = payload.data;
    const paymentStatus = status === "success" ? "paid" : "failed";
    console.log("💰 Payment status:", paymentStatus);

    // Find the order based on tx_ref (reference)
    const order = await prisma.order.findUnique({ where: { tx_ref: reference } });
    if (!order) {
      console.warn(`⚠️ Order not found for reference ${reference}`);
      return res.sendStatus(200); // prevent Paystack retry
    }

    // If already processed, skip
    if (order.status === "paid") {
      console.log(`✅ Order ${order.tx_ref} already marked as paid.`);
      return res.sendStatus(200);
    }

    const failedItems = [];

    if (paymentStatus === "paid") {
      for (const item of order.items) {
        const productId = item.productId || item.id; // fallback in case you still use 'id' somewhere

        if (!productId) {
          console.warn("⚠️ Skipping item with no productId:", item);
          continue;
        }

        const product = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (product && product.stock >= item.quantity) {
          await prisma.product.update({
            where: { id: productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
          console.log(`📦 Updated stock for product ${productId}: -${item.quantity}`);
        } else {
          failedItems.push(item);

          await prisma.adminAlert.create({
            data: {
              type: "stock_alert",
              message: `Product "${product?.productName || "Unknown"}" (ID: ${productId}) is out of stock but was ordered.`,
              relatedItem: productId,
            },
          });


          console.warn(`⚠️ Product out of stock: ${productId}`);
        }
      }
    }

    // Update order status and tracking
    await prisma.order.update({
      where: { tx_ref: reference },
      data: {
        status: paymentStatus,
        trackingId: order.trackingId || generateTrackingID(),
      },
    });

    console.log(`✅ Order ${reference} updated to status: ${paymentStatus}`);

    return res.sendStatus(200);
  } catch (err) {
    console.error("💥 Webhook error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};




export const getOrderStatus = async (req, res) => {
  const { tx_ref } = req.query;

  try {
    const order = await prisma.order.findUnique({ where: { tx_ref } });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ status: order.status, trackingId: order.trackingId });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

