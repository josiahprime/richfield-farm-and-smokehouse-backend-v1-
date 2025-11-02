import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateStatus = async () => {
  console.log("Migration script started"); // <--- add this

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // const conn = await mongoose.connect(process.env.MONGODB_URI, {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    const result = await User.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );

    console.log(`${result.modifiedCount} users updated`);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Migration failed:', error);
  }

  console.log("Migration script ended"); // <--- add this
};

migrateStatus();

