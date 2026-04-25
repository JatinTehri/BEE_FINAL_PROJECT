const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    productKey: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

wishlistSchema.index({ userId: 1, productKey: 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);
