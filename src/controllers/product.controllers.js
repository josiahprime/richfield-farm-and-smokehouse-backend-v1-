import { prisma } from "../lib/prisma.js";
import NodeCache from 'node-cache';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import sharp from 'sharp';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour


const invalidateProductCache = () => {
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.startsWith('products:')) cache.del(key);
  });
};



export const createProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      category,
      subCategory,
      priceInKobo,
      stock,
      rating = 0.0,
      unitType,
      isVariableWeight,
      displayLabel,
      minOrderQuantity,
      tags,
      discountId,      // 🆕 only this now
    } = req.body;

    // console.log(req.body)

    const createdById = req.user.id;

    // 🔍 Validate product name
    const existing = await prisma.product.findFirst({ where: { productName } });
    if (existing) {
      return res.status(400).json({ message: "Product already exists." });
    }

    // 🧩 Parse and normalize values
    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : [];
    const parsedStock = parseInt(stock, 10);
    const parsedPrice = parseInt(priceInKobo, 10);
    const parsedRating = parseFloat(rating);
    const parsedIsVariableWeight = isVariableWeight === "true" || isVariableWeight === true;
    const parsedMinOrderQuantity = parsedIsVariableWeight
      ? parseFloat(minOrderQuantity) || 0.5
      : null;

    // 🖼 Upload images to Cloudinary
    const imageEntries = [];
    for (const [i, file] of req.files.entries()) {
      const compressed = await sharp(file.buffer)
        .resize({ width: 800 })
        .webp({ quality: 80 })
        .toBuffer();

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products", format: "webp" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        streamifier.createReadStream(compressed).pipe(stream);
      });

      imageEntries.push({
        url: uploadResult.secure_url,
        index: i,
        publicId: uploadResult.public_id,
      });
    }

    // ✅ Create Product
    const newProduct = await prisma.product.create({
      data: {
        productName,
        description,
        category,
        subCategory,
        displayLabel,
        priceInKobo: parsedPrice,
        stock: parsedStock,
        rating: parsedRating,
        unitType: unitType?.toLowerCase() || "piece",
        isVariableWeight: parsedIsVariableWeight,
        minOrderQuantity: parsedMinOrderQuantity,
        tags: parsedTags,
        createdBy: { connect: { id: createdById } },
        images: { create: imageEntries },
        ...(discountId ? { discount: { connect: { id: discountId } } } : {}),
      },
      include: {
        images: true,
        discount: true,
      },
    });

    // ✅ Invalidate only product-related caches
    invalidateProductCache();

    // Clean response
    const minimalImages = newProduct.images.map((img) => ({
      id: img.id,
      url: img.url,
      index: img.index,
    }));

    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product: {
        ...newProduct,
        images: minimalImages,
      },
    });
  } catch (error) {
    console.error("❌ Error creating product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/// ✅ Update Product
export const updateProduct = async (req, res) => {
  const id = req.body.id;
  const {
    productName,
    priceInKobo, // ✅ renamed for consistency
    stock,
    category,
    tags,
    description,
    newImageIndexes,
    displayLabel,
    unitType,
    isVariableWeight,
    minOrderQuantity,
    discountId, // ✅ added
  } = req.body;

  console.log(req.body)

  const ALLOWED_UNIT_TYPES = ["piece", "kg", "litre", "pack", "dozen", "crate"];
  const normalizedUnitType = unitType?.toLowerCase();

  if (unitType && !ALLOWED_UNIT_TYPES.includes(normalizedUnitType)) {
    return res.status(400).json({ message: "Invalid unit type" });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    // 🧮 Parse image indexes
    const parsedIndexes = Array.isArray(newImageIndexes)
      ? newImageIndexes.map((i) => parseInt(i, 10))
      : newImageIndexes
      ? [parseInt(newImageIndexes, 10)]
      : [];

    const parsedIsVariableWeight =
      isVariableWeight === "true" || isVariableWeight === true;

    const parsedMinOrderQuantity = parsedIsVariableWeight
      ? parseFloat(minOrderQuantity) || 0.5
      : null;

    const newImageEntries = [];

    // 🖼️ Handle new uploaded images
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const index = parsedIndexes[i] ?? i;

        const compressedImage = await sharp(file.buffer)
          .resize({ width: 800 })
          .webp({ quality: 80 })
          .toBuffer();

        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products", format: "webp" },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          streamifier.createReadStream(compressedImage).pipe(stream);
        });

        newImageEntries.push({
          url: result.secure_url,
          publicId: result.public_id,
          index,
        });
      }
    }

    // 🔄 Replace or create new image entries
    for (const newImg of newImageEntries) {
      const existing = product.images.find((img) => img.index === newImg.index);
      if (existing) {
        // 🗑️ Delete old Cloudinary image
        if (existing.publicId) {
          try {
            await cloudinary.uploader.destroy(existing.publicId);
          } catch (cloudErr) {
            console.warn("Cloudinary deletion failed:", cloudErr);
          }
        }

        // 🔁 Update existing image
        await prisma.productImage.update({
          where: { id: existing.id },
          data: {
            url: newImg.url,
            publicId: newImg.publicId,
          },
        });
      } else {
        // ➕ Add a new image
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: newImg.url,
            index: newImg.index,
          },
        });
      }
    }

    // 🏷️ Parse tags
    let parsedTags = tags;
    if (typeof tags === "string" && tags.startsWith("[")) {
      parsedTags = JSON.parse(tags);
    }

    // ✅ Handle discount logic
    // If discountId is provided → connect it
    // If discountId is an empty string → disconnect
    // If undefined → leave it as-is
    let discountAction = {};
    if (discountId) {
      discountAction = { discount: { connect: { id: discountId } } };
    } else if (discountId === "") {
      discountAction = { discount: { disconnect: true } };
    }

    // 🧩 Update product details
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        productName,
        description,
        category,
        displayLabel,
        unitType: normalizedUnitType || "piece",
        isVariableWeight: parsedIsVariableWeight,
        minOrderQuantity: parsedMinOrderQuantity,
        stock: stock ? parseInt(stock, 10) : undefined,
        priceInKobo: priceInKobo ? parseInt(priceInKobo, 10) : undefined,
        tags: parsedTags,
        ...discountAction, // ✅ dynamic discount update
      },
      include: { images: true, discount: true },
    });

    // ✅ Invalidate only product-related caches
    invalidateProductCache();

    // ✂️ Simplify images
    const minimalImages = updatedProduct.images
      .map((img) => ({
        id: img.id,
        url: img.url,
        index: img.index,
      }))
      .sort((a, b) => a.index - b.index);

    res.status(200).json({
      ...updatedProduct,
      images: minimalImages,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error" });
  }
};





// DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  console.log('delete route triggered');
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  try {
    const existing = await prisma.product.findFirst({ where: { id } });
    if (!existing) return res.status(400).json({ message: 'Item not found' });

    // Delete associated Cloudinary images
    if (existing.images && Array.isArray(existing.images)) {
      for (const image of existing.images) {
        if (image.public_id) {
          try {
            await cloudinary.uploader.destroy(image.public_id);
            console.log(`Deleted Cloudinary image: ${image.public_id}`);
          } catch (cloudErr) {
            console.warn(`Failed to delete image ${image.public_id}:`, cloudErr);
          }
        }
      }
    }

    // Delete product from DB
    await prisma.product.delete({ where: { id } });

    // ✅ Invalidate only product-related caches
    invalidateProductCache();
    console.log('Product cache cleared');

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product', error);
    res.status(500).json({ message: 'Server error' });
  }
};








// GET ALL PRODUCTS
// export const getAllProducts = async (req, res) => {
//   try {
//     const { category, userId } = req.query; // ✅ read userId from query

//     const cachedProducts = cache.get('products');
//     if (cachedProducts) return res.json(cachedProducts);

//     const filters = {};
//     if (category) {
//       filters.category = category;
//     }

//     // Fetch products
//     const products = await prisma.product.findMany({
//       where: filters,
//       select: {
//         id: true,
//         productName: true,
//         description: true,
//         priceInKobo: true,
//         discount: true,
//         displayLabel: true,
//         stock: true,
//         unitType: true,
//         isVariableWeight: true,
//         minOrderQuantity: true,
//         category: true,
//         tags: true,
//         images: {
//           select: {
//             id: true,
//             url: true,
//             index: true,
//           },
//         },
//         // ✅ Pull favorites for this user only
//         favorites: userId
//           ? {
//               where: { userId }, // filter favorites by current user
//               select: { id: true },
//             }
//           : false,
//       },
//     });

//     cache.set('products', products);

//     // ✅ Map to include `isFavorite` boolean
//     const enriched = products.map((p) => ({
//       ...p,
//       isFavorite: p.favorites && p.favorites.length > 0, // true if user has favorited
//     }));

//     res.status(200).json({ products: enriched });
//     // console.log(enriched)
//   } catch (err) {
//     console.error("Error fetching products:", err);
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// };
export const getAllProducts = async (req, res) => {
  try {
    const { category, userId } = req.query;

    // ✅ Cache key includes userId and category
    const cacheKey = `products:${userId || 'guest'}:${category || 'all'}`;
    const cachedProducts = cache.get(cacheKey);
    if (cachedProducts) return res.json({ products: cachedProducts });

    const filters = {};
    if (category) filters.category = category;

    const products = await prisma.product.findMany({
      where: filters,
      select: {
        id: true,
        productName: true,
        description: true,
        priceInKobo: true,
        discount: true,
        displayLabel: true,
        stock: true,
        unitType: true,
        isVariableWeight: true,
        minOrderQuantity: true,
        category: true,
        tags: true,
        images: { select: { id: true, url: true, index: true } },
        favorites: userId
          ? { where: { userId }, select: { id: true } }
          : false,
      },
    });

    const enriched = products.map((p) => ({
      ...p,
      isFavorite: p.favorites && p.favorites.length > 0,
    }));

    // ✅ Store enriched products in cache
    cache.set(cacheKey, enriched);

    // console.log('response from products', enriched)
    res.status(200).json({ products: enriched });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};



// GET SINGLE PRODUCT
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    // console.log('id and userId from get product',id, userId)

    // Validate ID
    if (!id) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const cacheKey = `product:${id}:${userId || 'guest'}`;
    const cachedProduct = cache.get(cacheKey);
    if (cachedProduct) return res.json({ product: cachedProduct });

    // Fetch product with relations
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        productName: true,
        description: true,
        priceInKobo: true,
        discount: true,
        displayLabel: true,
        stock: true,
        unitType: true,
        isVariableWeight: true,
        minOrderQuantity: true,
        category: true,
        tags: true,
        images: { select: { id: true, url: true, index: true } },
        favorites: userId
          ? { where: { userId }, select: { id: true } }
          : false,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Add isFavorite field
    const enrichedProduct = {
      ...product,
      isFavorite: product.favorites && product.favorites.length > 0,
    };

    cache.set(cacheKey, enrichedProduct);

    res.status(200).json({ product: enrichedProduct });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};


export const fetchFavorites = async (req, res) => {
  try {
    const { userId } = req.params;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true, // ✅ include product images
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(favorites.map((fav) => fav.product));
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
};



export const toggleFavorites = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const existing = await prisma.favorite.findUnique({
      where: { user_product_unique: { userId, productId } },
      include: {
        product: {
          include: { images: true }, // ✅ include images here too
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { user_product_unique: { userId, productId } },
      });

      return res.json({
        status: "removed",
        product: { ...existing.product, isFavorite: false },
      });
    } else {
      const favorite = await prisma.favorite.create({
        data: { userId, productId },
        include: {
          product: {
            include: { images: true }, // ✅ include images here too
          },
        },
      });

      return res.json({
        status: "added",
        product: { ...favorite.product, isFavorite: true },
      });
    }
  } catch (err) {
    console.error("Error toggling favorite:", err);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
};



// GET /api/daily-deals
export const fetchDailyDeals = async (req, res) => {
  try {
    const now = new Date();
    const deals = await prisma.dailyDeal.findMany({
      where: {
        expiresAt: { gte: now },
      },
      include: {
        product: {
          include: {
            images: true,
            discount: true,
          },
        },
      },
    });

    res.json({ dailyDeals: deals });
  } catch (err) {
    console.error("❌ Error fetching daily deals:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const popularProducts = async (req, res) => {
  console.log('🔍 Fetching popular products...');
  try {
    const products = await prisma.product.findMany({
      where: { isPopular: true },
      take: 10,
      orderBy: {
        popularAt: 'desc',
      },
      include: {
        images: true, // ✅ include product images directly
      },
    });

    

    // console.log('✅ Popular products:', products);
    return res.status(200).json({ popularProducts: products });
  } catch (error) {
    console.error("❌ Error fetching popular products:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


