import express from 'express'
import { protectRoute } from '../middlewares/auth.middleware.js';
import { isAdmin, isAuthenticated } from "../middlewares/roles.middleware.js";
import { createProduct, deleteProduct, fetchDailyDeals, fetchFavorites, getAllProducts, getProduct, popularProducts, toggleFavorites, updateProduct } from '../controllers/product.controllers.js';
import { uploadCreateImages, uploadUpdateImages } from '../middlewares/uploadProductImages.middleware.js';

const router = express.Router();

//update an existing product
router.put('/:id', protectRoute, isAdmin, uploadUpdateImages,  updateProduct);
//delete an existing product
router.delete('/:id', protectRoute, isAdmin, deleteProduct)
//add a new product
router.post('/add-product', protectRoute, isAdmin, uploadCreateImages, createProduct)

//get all products
router.get('/get-products', getAllProducts)

//get a single product
router.get('/:id', getProduct)

//get all favorites
// Favorites
router.get('/favorites/:userId', fetchFavorites); // fetch favorites
router.post('/favorites/toggle', toggleFavorites); // toggle favorites

router.get('/daily-deals',  fetchDailyDeals)

router.get('/popular-products', popularProducts)

export default router;