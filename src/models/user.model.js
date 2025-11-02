
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },
        
        password: {
            type: String,
            minLength: 6,
            required: function () {
                return this.authProvider === "local"; // ✅ Password required only for local users
              },
        },

        role: { 
            type: String, 
            enum: ['admin', 'manager', 'customer'], // Restricts allowed roles
            default: 'customer'  // New users are customers by default
        },

        status: {
            type: String,
            enum: ["active", "inactive", "banned"],
            default: "active",
        },

        authProvider: { type: String, enum: ["local", "google"], required: true },
        // clerkId: { type: String, unique: true, sparse: true }, // Used for Google users

        profilePic: {
            type: String,
            default: ''
        },

        verified: { 
            type: Boolean, 
            default: false 
        },

        verificationTokenCreatedAt: Date,
        verificationTokenExpires: Date, // Optional, if you want token expiration
        createdAt: { type: Date,
             default: Date.now
             },
        verificationToken: String,
        
    },
    { timestamps: true }

)

const User = mongoose.model('User', userSchema)

export default User;