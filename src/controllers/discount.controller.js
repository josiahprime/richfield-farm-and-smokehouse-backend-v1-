import { prisma } from "../lib/prisma.js";

// 🧠 Automatically expire outdated discounts
const expireOutdatedDiscounts = async () => {
  const now = new Date();

  await prisma.discount.updateMany({
    where: {
      endDate: { lt: now },
      isActive: true,
    },
    data: { isActive: false },
  });
};

// ✅ Get all discounts (auto-expiring outdated ones)
export const getDiscounts = async (req, res) => {
  try {
    // Auto-expire outdated ones before fetching
    await expireOutdatedDiscounts();

    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, discounts });
  } catch (err) {
    console.error("Failed to fetch discounts:", err);
    res.status(500).json({ error: "Failed to fetch discounts" });
  }
};

// ✅ Create new discount
export const createDiscount = async (req, res) => {
  try {
    const { label, type, value, startDate, endDate, isActive } = req.body;

    // Validation checks
    if (!label || !type || value === undefined) {
      return res.status(400).json({ error: "Label, type, and value are required." });
    }

    if (type !== "PERCENTAGE" && type !== "FIXED") {
      return res.status(400).json({ error: "Invalid discount type." });
    }

    if (type === "PERCENTAGE" && value > 100) {
      return res.status(400).json({ error: "Percentage discount cannot exceed 100%." });
    }

    if (startDate && new Date(startDate) < new Date()) {
    return res.status(400).json({ error: "Start date cannot be in the past." });
    }

    if (endDate && new Date(endDate) < new Date()) {
    return res.status(400).json({ error: "End date cannot be in the past." });
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: "End date cannot be before start date." });
    }


    const discount = await prisma.discount.create({
      data: {
        label,
        type,
        value: parseFloat(value),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive ?? true,
      },
    });

    res.status(201).json({ success: true, discount });
  } catch (err) {
    console.error("Failed to create discount:", err);
    res.status(500).json({ error: "Failed to create discount" });
  }
};

// ✅ Update discount
export const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, type, value, startDate, endDate, isActive } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Discount ID is required." });
    }

    if (startDate && new Date(startDate) < new Date()) {
    return res.status(400).json({ error: "Start date cannot be in the past." });
    }

    if (endDate && new Date(endDate) < new Date()) {
    return res.status(400).json({ error: "End date cannot be in the past." });
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: "End date cannot be before start date." });
    }


    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Discount not found." });
    }

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        label,
        type,
        value: parseFloat(value),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: Boolean(isActive),
      },
    });

    res.json({ success: true, discount });
  } catch (err) {
    console.error("Failed to update discount:", err);
    res.status(500).json({ error: "Failed to update discount" });
  }
};

// ✅ Delete discount
export const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Discount ID is required." });
    }


    await prisma.discount.deleteMany({ where: { id } });

    res.json({ success: true, message: "Discount deleted successfully." });
  } catch (err) {
    console.error("Failed to delete discount:", err);
    res.status(500).json({ error: "Failed to delete discount" });
  }
};
