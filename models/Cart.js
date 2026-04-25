const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
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
    },
    quantity: { type: Number, default: 1 }
}, {
    timestamps: true
});

cartSchema.index({ userId: 1, productKey: 1 }, { unique: true });

module.exports = mongoose.model("Cart", cartSchema);
