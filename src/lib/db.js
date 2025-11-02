// import mongoose from 'mongoose'
import { PrismaClient } from "@prisma/client";



// export const connectDB = async ()=>{
//     try {
//         const conn = await mongoose.connect(process.env.MONGODB_URI)
//         console.log(`MondoDB Connected: ${conn.connection.host}`)
//     } catch (error) {
//         console.log('mongoDB connection error', error)
//     }
// };

const prisma = new PrismaClient();


export const connectDB = async ()=>{
    try {
        await prisma.$connect();
        console.log("Prisma connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};