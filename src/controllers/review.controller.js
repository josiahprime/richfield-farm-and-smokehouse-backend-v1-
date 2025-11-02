import { prisma } from "../lib/prisma.js";

// Get all reviews for a product
export const getReviews = async (req, res) => {
  try {
    let { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Ensure productId is a string
    productId = String(productId);

    // ✅ Fetch reviews with optional profilePic
    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePic: true, // optional — may be null
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Map to frontend format (user.name & optional profilePic)
    const formattedReviews = reviews.map((review) => ({
      ...review,
      user: {
        name: review.user.username,
        profilePic: review.user.profilePic || null,
      },
    }));

    res.json({ success: true, reviews: formattedReviews });
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

// Add a new review
export const addReview = async (req, res) => {
  try {
    const userId = req.user?.id; // from auth middleware
    let { productId, rating, text } = req.body;

    if (!productId || !rating || !text) {
      return res.status(400).json({ error: "All fields are required" });
    }

    productId = String(productId);

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // ✅ Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({ error: "You’ve already reviewed this product." });
    }

    // ✅ Create review with user details (including optional profilePic)
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating: Number(rating),
        text,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePic: true, // optional
          },
        },
      },
    });

    // ✅ Format response for frontend
    const formattedReview = {
      ...review,
      user: {
        name: review.user.username,
        profilePic: review.user.profilePic || null,
      },
    };

    res.status(201).json({ success: true, review: formattedReview });
  } catch (err) {
    console.error("Failed to create review:", err);
    res.status(500).json({ error: "Failed to create review" });
  }
};

// Update a review
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, text } = req.body;

    const existingReview = await prisma.review.findUnique({
      where: { id: String(id) },
    });

    if (!existingReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Only allow the review owner or admin to edit
    if (existingReview.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.review.update({
      where: { id: String(id) },
      data: { rating, text },
    });

    res.json({ success: true, review: updated });
  } catch (err) {
    console.error("Failed to update review:", err);
    res.status(500).json({ error: "Failed to update review" });
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: String(id) },
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Only owner or admin can delete
    if (review.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.review.delete({ where: { id: String(id) } });

    res.json({ success: true, message: "Review deleted successfully" });
  } catch (err) {
    console.error("Failed to delete review:", err);
    res.status(500).json({ error: "Failed to delete review" });
  }
};
