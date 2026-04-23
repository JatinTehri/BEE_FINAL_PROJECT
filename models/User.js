const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    username: {
        type: String,
        unique: true,
        sparse: true   // 🔥 allows null (important for Google login)
    },

    password: {
        type: String,
        default: null   // 🔥 Google users don’t have password
    },

    profilePic: {
        type: String,
        default: null
    },

    // 🔥 GOOGLE LOGIN FIELD
    googleId: {
        type: String,
        default: null
    }

}, {
    timestamps: true   // 🔥 adds createdAt & updatedAt
});

module.exports = mongoose.model("User", userSchema);