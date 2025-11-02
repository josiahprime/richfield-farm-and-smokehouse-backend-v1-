import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  tx_ref: { type: String, unique: true, required: true }, // Flutterwave transaction reference
  trackingId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{ name: String, quantity: Number, priceInKobo: Number, image: String, description: String}],
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "paid", "Out for Delivery", "completed", "failed", "cancelled", "success"], default: "pending" },
  fulfillmentStatus: {
    type: String,
    enum: ["Processing", "Shipped", "Out for Delivery", "Delivered"],
    default: "Processing"
  },

  // Optional delivery fields
  deliveryProvider: { type: String }, // e.g., DHL, FedEx
  deliveryTrackingUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});




const Order = mongoose.model("Order", OrderSchema);


export default Order;



