import express from 'express'
import { protectRoute } from '../middlewares/auth.middleware.js';
import { isAdmin, isAuthenticated } from "../middlewares/roles.middleware.js";
import { createProduct, deleteProduct, fetchDailyDeals, fetchFavorites, fetchHolidayDeals, getAllProducts, getProduct, popularProducts, toggleFavorites, updateProduct } from '../controllers/product.controllers.js';
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

router.get('/daily-deals', (req, res, next) => {
  console.log('➡️ /daily-deals route hit, forwarding to fetchDailyDeals');
  next(); // pass control to the actual controller
}, fetchDailyDeals);

router.get('/holiday-deals', (req, res, next) => {
  console.log('➡️ /holiday deals route hit, forwarding to holidayDeals');
  next(); // pass control to the actual controller
}, fetchHolidayDeals);

router.get('/popular-products', (req, res, next) => {
  console.log('➡️ /popular-products route hit, forwarding to popularProducts');
  next(); // pass control to the actual controller
}, popularProducts);



//get a single product
router.get('/:id', getProduct)

//get all favorites
// Favorites
router.get('/favorites/:userId', fetchFavorites); // fetch favorites
router.post('/favorites/toggle', toggleFavorites); // toggle favorites

// router.get('/daily-deals',  fetchDailyDeals)

// router.get('/popular-products', popularProducts)




export default router;