import User from '../models/user.model.js';
import { prisma } from "../lib/prisma.js";

// GET all users
export const getAllUsers = async (req, res) => { 
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        authProvider: true,
        profilePic: true,
        createdAt: true,
        // 🔒 password not included
      },
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getCurrentUser =async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        // ✅ Do NOT return password
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}



export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  console.log(role)
  if (!role) {
    return res.status(400).json({ message: 'Missing role to update' });
  }

  if (!["admin", "moderator", "customer"].includes(role)) {
  return res.status(400).json({ message: 'Invalid role' }); 
  }


  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
      
    }

    if (user.role === role) {
      return res.status(400).json({ message: `User is already a ${role}` });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        // ✅ exclude password on purpose
      },
    });

    console.log(updatedUser)

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Failed to update user role:", err);
    res.status(500).json({ message: 'Failed to update user role' });
  }
};

export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Missing status to update' });
  }

  if (!["active", "inactive", "banned"].includes(status)) {
  return res.status(400).json({ message: 'Invalid status' }); 
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status === status) {
      return res.status(400).json({ message: `User is already ${status}` });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("Failed to update user status:", err);
    res.status(500).json({ message: 'Failed to update user status' });
  }
};





