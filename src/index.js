import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';  // Required for Passport sessions
import compression from 'compression';
import cors from 'cors';
import http from 'http';
import './cron/dailyDeals.js'; // this kicks off the cron scheduler
import './cron/popularProducts.js'
import { initSocket } from './socket.js'; // ✅
import passport from 'passport';  // Import Passport
import './lib/passport.js'; // Ensure Passport strategies are loaded
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import productRoutes from './routes/product.route.js'
import payRoutes from './routes/pay.route.js';
import orderRoutes from './routes/order.route.js'
import userRoutes from './routes/user.route.js'
import notificationRoutes from './routes/notification.route.js'
import accountRoutes from './routes/account.route.js'
import reviewRoutes from './routes/review.route.js'
import discountRoutes from './routes/discount.route.js'
import cartRoutes from './routes/cartRoutes.js'
import { connectDB } from './lib/db.js';
import { apiLimiter } from './rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const allowedOrigins = 
[
  'http://localhost:5173', 
  'http://localhost:3000', 
  'http://172.30.26.161:3000', 
  'http://10.107.16.161:3000',
  'http://10.102.252.161:3000',
  'http://10.107.16.161:3000',
  'https://richfield-farm-and-smokehouse-backend-v1.onrender.com',
];



//socket io setup 
const server = http.createServer(app); // wrap express in HTTP server
initSocket(server); // ✅






// Middleware
app.use(compression()); 
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());


app.use(
  cors({
    // origin: allowedOrigins,
    origin: function (origin, callback) {
      console.log("🔍 Request origin:", origin);
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Apply rate limiter to all /api routes
// app.use('/api', apiLimiter);
if (process.env.NODE_ENV === 'production') {
  app.use('/api', apiLimiter);
}


// Routes
// app.use('/api/auth', authRoutes);
app.use('/api/auth', (req, res, next) => {
    console.log(`📢 Request received at /api/auth: ${req.method} ${req.url}`);
    next();
}, authRoutes);

// app.use('/api/cart', cartRoutes);
app.use('/api/cart', (req, res, next) => {
    console.log(`📢 Request received at /api/cart: ${req.method} ${req.url}`);
    next();
}, cartRoutes);

app.use('/api/messages', messageRoutes);
app.use('/api/products',(req, res, next) => {
    console.log(`📢 Request received at /api/products: ${req.method} ${req.url}`);
    next();
},  productRoutes);



app.use('/api/pay', (req, res, next) => {
    console.log(`📢 Request received at /api/pay: ${req.method} ${req.url}`);
    next();
}, payRoutes);

app.use('/api/orders', (req, res, next) => {
    console.log(`📢 Request received at /api/orders: ${req.method} ${req.url}`);
    next();
}, orderRoutes);

app.use('/api/users', (req, res, next)=>{
    console.log(`📢 Request received at /api/users: ${req.method} ${req.url}`);
    next();
}, userRoutes)

app.use('/api/notifications', (req, res, next)=>{
    console.log(`📢 Request received at /api/notifications: ${req.method} ${req.url}`);
    next();
}, notificationRoutes)

app.use('/api/account', (req, res, next)=>{
    console.log(`📢 Request received at /api/account: ${req.method} ${req.url}`);
    next();
}, accountRoutes)

app.use('/api/reviews', (req, res, next)=>{
    console.log(`📢 Request received at /api/reviews: ${req.method} ${req.url}`);
    next();
}, reviewRoutes)


app.use('/api/discounts', (req, res, next)=>{
    console.log(`📢 Request received at /api/discounts: ${req.method} ${req.url}`);
    next();
}, discountRoutes)

// /api/server-time
app.get('/api/server-time', (req, res) => {
  const now = new Date();

  // Set the next refresh to the start of the next minute
  const nextRefresh = new Date(now.getTime() + 60 * 1000);
  nextRefresh.setSeconds(0);
  nextRefresh.setMilliseconds(0);

  console.log("📡 /api/server-time hit at:", now.toISOString());
  console.log("🕒 Next refresh at:", nextRefresh.toISOString());

  res.json({
    serverTime: now.toISOString(),
    expiresAt: nextRefresh.toISOString(), // used by frontend
    timestamp: now.getTime(),
    timezoneOffset: now.getTimezoneOffset()
  });
});



server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
  connectDB();
});


// psql -h localhost -p 5000 -U postgres
// ALTER USER postgres WITH PASSWORD 'josiahs0$';


