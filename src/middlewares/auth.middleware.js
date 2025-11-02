import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const protectRoute = async (req, res, next) => {
  try {
    // console.log('🍪 Cookies object:', req.cookies);

    const token = req.cookies.jwt; // read JWT from cookie

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized - No Token Provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({ message: 'Unauthorized - Invalid Token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        authProvider: true,
        profilePic: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error in protectRoute middleware:', error.message);
    return res.status(401).json({ message: 'Unauthorized - Invalid or Expired Token' });
  }
};
