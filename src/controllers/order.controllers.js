// controllers/order.controller.js
import { prisma } from "../lib/prisma.js";
import { sendOrderShippedNotification, sendOrderPlacedNotification, sendOutForDeliveryNotification, sendDeliveredNotification } from "./notifications.controllers.js";


export const getAllOrders = async (req, res) => {
  console.log('we hit get all orders route');
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Map through each order to group shipping details
    const formattedOrders = orders.map(order => {
      const {
        phone,
        address,
        city,
        state,
        postalCode,
        landmark,
        pickupStation,
        extraInstructions,
        subtotal,
        taxRate,
        taxAmount,
        shippingFee,
        total,
        ...rest
      } = order;

      return {
        ...rest,
        shipping: {
          phone,
          address,
          city,
          state,
          postalCode,
          landmark,
          pickupStation,
          extraInstructions
        },
        pricing: {
          subtotal,
          taxRate,
          taxAmount,
          shippingFee,
          total
        }
      };

    });

    res.status(200).json(formattedOrders);
    console.log('orders fetched successfully');
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateOrderStatus = async (req, res) => {
  const { status, fulfillmentStatus } = req.body;
  const { id } = req.params;
  const ALLOWED_FULFILLMENT_STATUSES = ['Processing', 'Shipped', 'OutForDelivery', 'Delivered'];
  console.log(fulfillmentStatus)
  try {
    // Validate status value
    if (!ALLOWED_FULFILLMENT_STATUSES.includes(fulfillmentStatus)) {
      return res.status(400).json({ message: 'Invalid fulfillment status value' });
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id }, // 👈 Match using trackingId
    });

    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Block update if order is pending OR unpaid
    if (
      existingOrder.fulfillmentStatus === 'Pending' ||
      existingOrder.status === 'Unpaid'
    ) {
      return res.status(400).json({
        message: 'Cannot update status of a pending or unpaid order',
      });
    }

    // Send appropriate notification
    switch (fulfillmentStatus) {
      case 'Shipped':
        await sendOrderShippedNotification(existingOrder.userId, existingOrder.trackingId);
        break;
      case 'OutForDelivery':
        await sendOutForDeliveryNotification(existingOrder.userId, existingOrder.trackingId);
        break;
      case 'Delivered':
        await sendDeliveredNotification(existingOrder.userId, existingOrder.trackingId);
        break;
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        fulfillmentStatus,
        status: status || existingOrder.status,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
    console.log('order status changed')
    console.log(updatedOrder)
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getMyOrders = async (req, res) => {
  console.log('we hit get specific orders route');
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }, // ✅ Correct key
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const orders = await prisma.order.findMany({
      where: { userId }, // ✅ This is okay because Order has userId
      orderBy: { createdAt: "desc" },
      select: {
        items: true,
        trackingId: true,
        id: true,
        createdAt: true,
        fulfillmentStatus: true,
      },
    });

    console.log("orders fetched successfully");
    res.status(200).json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const previewOrder = async (req, res) => {
  const { cartItems, userAddress, deliveryType } = req.body;
  console.log("📦 Body received in previewOrder:", JSON.stringify(req.body, null, 2));

  if (!cartItems || !deliveryType) {
    return res.status(400).json({ message: "Missing cart items or delivery type." });
  }

  if (deliveryType === "home" && (!userAddress?.state || !userAddress?.city)) {
    return res.status(400).json({ message: "Missing state or city for home delivery." });
  }

  try {
    let subtotal = 0;

    for (const item of cartItems) {
      console.log(
        `🛒 Item: ${item.productId || item.id}, Price: ₦${item.priceInKobo}, Qty: ${item.quantity}`
      );
      subtotal += item.priceInKobo * item.quantity;
    }

    console.log("Subtotal (Naira):", subtotal);

    const taxRate = 0.075;
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    console.log("Tax:", taxAmount);

    let shippingFee = 0;
    if (deliveryType === "home") {
      let shippingRate = await prisma.shippingRate.findFirst({
        where: { state: userAddress.state, city: userAddress.city },
      });

      if (!shippingRate) {
        shippingRate = await prisma.shippingRate.findFirst({
          where: { state: userAddress.state, city: "default" },
        });
      }

      shippingFee = subtotal > 50000 ? 0 : (shippingRate?.fee || 3500);
      console.log("Shipping fee:", shippingFee);
    }

    const total = subtotal + taxAmount + shippingFee;
    console.log("🧾 Final total (preview):", total);

    return res.status(200).json({ subtotal, taxRate, taxAmount, shippingFee, total });
  } catch (err) {
    console.error("Error previewing order:", err);
    res.status(500).json({ message: "Server error" });
  }
};

