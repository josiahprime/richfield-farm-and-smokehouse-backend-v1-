import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

export const generateToken = async (userId, role) => {
  const accessToken = jwt.sign(
    { userId: userId.toString(), role },
    process.env.JWT_SECRET,
    { expiresIn: "1m" }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  // Store refresh token in DB
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken: {
        create: {
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  return { accessToken, refreshToken };
};
