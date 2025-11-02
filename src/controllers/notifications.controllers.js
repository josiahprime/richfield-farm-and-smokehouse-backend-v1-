import { prisma } from "../lib/prisma.js";
import { getIO } from "../socket.js";

// Emit socket event to the user's room
const emitNotification = (userId, notification) => {
  const io = getIO();
  io.to(userId.toString()).emit("newNotification", notification);
};

// 1. Order Placed
export const sendOrderPlacedNotification = async (userId, orderId) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title: "Order Successfully Placed",
      message: `Thanks for your purchase! Your order #${orderId} has been placed successfully and is now being processed. Our team is carefully picking and packing your items to ensure everything arrives in perfect condition. You’ll receive another update as soon as it’s on the way.`,
      type: "ORDER",
    },
  });
  emitNotification(userId, notification);
};

// 2. Order Shipped
export const sendOrderShippedNotification = async (userId, orderId) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title: "Your Order Has Been Shipped",
      message: `Exciting news! Your order #${orderId} has left our facility and is now with the delivery partner. You can expect your items to arrive within the estimated delivery window. For any questions or updates, feel free to check your order status or contact our support team.`,
      type: "ORDER",
    },
  });
  emitNotification(userId, notification);
};

// 3. Out for Delivery
export const sendOutForDeliveryNotification = async (userId, orderId) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title: "Your Order is Out for Delivery",
      message: `Your order #${orderId} is currently out for delivery and will be arriving shortly. Please ensure someone is available to receive the package. We’re committed to delivering your order on time and in perfect condition. If you miss the delivery, don’t worry — we’ll provide a follow-up update.`,
      type: "ORDER",
    },
  });
  emitNotification(userId, notification);
};


// 4. Delivered
export const sendDeliveredNotification = async (userId, orderId) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title: 'Order Delivered',
      message: `Your order #${orderId} has been delivered. We hope you enjoy your purchase!`,
      type: 'ORDER',
    },
  });
  emitNotification(userId, notification);
};

// 5. Get notifications for a user
export const getNewNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// 6. Mark a notification as read
export const markNotificationsAsRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    console.log(notifId)
    await prisma.notification.update({
      where: { id: notifId },
      data: { read: true },
    });
    console.log('notification marked as read')
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
};

// PATCH /notifications/seen
export const MarkAllAsSeen = async (req, res) => {
  try {
    // Mark all unseen notifications for the current user as seen
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        seen: false,
      },
      data: {
        seen: true,
      },
    });

    return res.json({ success: true, message: 'Marked all as seen' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to mark as seen' });
  }
}



