// models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    tags: {
      type: [String], // Array of tags (e.g., ['new', 'sale'])
      default: ['General'],
    },    
    category: {
      type: String,
      default: 'General',
    },
    images: {
      type: [String], // Array of image URLs
      default: [],
    },
    priceInKobo: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a positive number'],
    },
    quantity: {
      type: Number,
      default: 1,
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock must be a positive number'],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
