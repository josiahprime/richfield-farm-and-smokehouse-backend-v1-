import { prisma } from "../lib/prisma.js";

// GET /cart
export const getCart = async (req, res) => {
    console.log('we hit get cart route')
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized - No user found" });
    }

    const userId = req.user.id;

    const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
    product: {
    include: {
    images: {
    select: { url: true },
    take: 1,
    },
    },
    },
    },
    });

    // 🧹 Clean up the response before sending it
    const formattedCart = cartItems.map(item => ({
    id: item.id,
    quantity: item.quantity,
    productId: item.productId,
    userId: item.userId,
    productName: item.product.productName,
    priceInKobo: item.product.priceInKobo,
    image: item.product.images[0]?.url || null,
    unitType: item.product.unitType,
    }));

    // console.log(formattedCart)


    res.json({ items: formattedCart });
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
};

// POST /cart
export const addToCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized - No user found" });
    }

    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || isNaN(quantity)) {
      return res.status(400).json({ error: "Invalid product or quantity" });
    }

    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) {
      return res.status(404).json({ error: "Product not found" });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { userId, productId },
    });

    let updatedItem;
    if (existing) {
      updatedItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (quantity || 1) },
      });
    } else {
      updatedItem = await prisma.cartItem.create({
        data: { userId, productId, quantity: quantity || 1 },
      });
    }

    res.json(updatedItem);
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
};

// PUT /cart/:id
export const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized - No user found" });
    }

    if (!id || typeof quantity !== "number" || quantity < 1) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const item = await prisma.cartItem.findUnique({ where: { id } });
    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ error: "Item not found" });
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update cart item error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
};

// DELETE /cart/:id
export const deleteCartItem = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized - No user found" });
    }

    const { id } = req.params;
    const item = await prisma.cartItem.findUnique({ where: { id } });
    console.log(item)

    console.log("🧩 Checking item ownership...");
    console.log("Item userId:", item?.userId);
    console.log("Request userId:", req.user.id);

    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ error: "Item not found" });
    }

    await prisma.cartItem.delete({ where: { id } });
    res.json({ message: "Item removed" });
  } catch (err) {
    console.error("Delete cart item error:", err);
    res.status(500).json({ error: "Failed to remove item" });
  }
};

// POST /cart/merge
export const mergeCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized - No user found" });
    }

    const userId = req.user.id;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No cart items to merge" });
    }

    for (const { productId, quantity } of items) {
      if (!productId || typeof quantity !== "number" || quantity < 1) continue;

      const productExists = await prisma.product.findUnique({ where: { id: productId } });
      if (!productExists) continue;

      const existing = await prisma.cartItem.findFirst({
        where: { userId, productId },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: { userId, productId, quantity },
        });
      }
    }

    const updatedCart = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    console.log(updatedCart)
    res.json(updatedCart);
  } catch (err) {
    console.error("Merge cart error:", err);
    res.status(500).json({ error: "Failed to merge cart" });
  }
};


// DELETE /cart/clear
export const clearCart = async (req, res) => {
    console.log('trying to clear cart')
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized - No user found" });
    }

    const userId = req.user.id;

    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("❌ Clear cart error:", err);
    res.status(500).json({ error: "Failed to clear cart" });
  }
};

