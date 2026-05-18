const Cart = require("../models/Cart");
const {
    PRODUCT_KEY_MAX_LENGTH,
    PRODUCT_NAME_MAX_LENGTH,
    PRODUCT_IMAGE_MAX_LENGTH
} = require("../config/constants");
const { getCartSummary } = require("../services/cartService");

const addToCart = async (req, res) => {
    try {
        const { productKey, name, price, image } = req.body;

        if (
            typeof productKey !== "string" ||
            typeof name !== "string" ||
            typeof price !== "number" ||
            !productKey.trim() ||
            !name.trim()
        ) {
            return res.status(400).json({ success: false, message: "Invalid product data" });
        }

        const normalizedPrice = Number(price);
        const safeProductKey = productKey.trim().slice(0, PRODUCT_KEY_MAX_LENGTH);
        const safeName = name.trim().slice(0, PRODUCT_NAME_MAX_LENGTH);
        const safeImage = typeof image === "string" ? image.trim().slice(0, PRODUCT_IMAGE_MAX_LENGTH) : "";

        if (Number.isNaN(normalizedPrice) || normalizedPrice < 0) {
            return res.status(400).json({ success: false, message: "Invalid price" });
        }

        const existingItem = await Cart.findOne({
            userId: String(req.user.id),
            productKey: safeProductKey
        });

        if (existingItem) {
            existingItem.quantity += 1;
            await existingItem.save();
        } else {
            await Cart.create({
                userId: String(req.user.id),
                productKey: safeProductKey,
                name: safeName,
                price: normalizedPrice,
                image: safeImage,
                quantity: 1
            });
        }

        const { itemCount, totalAmount } = await getCartSummary(req.user.id);

        return res.json({
            success: true,
            itemCount,
            totalAmount
        });
    } catch (err) {
        console.error("Cart add error:", {
            userId: req.user?.id,
            productKey: req.body?.productKey,
            error: err.message
        });
        return res.status(500).json({ success: false, message: "Failed to add to cart" });
    }
};

const getSummary = async (req, res) => {
    try {
        const { itemCount, totalAmount } = await getCartSummary(req.user.id);

        return res.json({
            success: true,
            itemCount,
            totalAmount
        });
    } catch (err) {
        console.error("Cart summary error:", { userId: req.user?.id, error: err.message });
        return res.status(500).json({ success: false, message: "Failed to fetch cart summary" });
    }
};

const getItems = async (req, res) => {
    try {
        const items = await Cart.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        return res.json({ success: true, items });
    } catch (err) {
        console.error("Cart items error:", { userId: req.user?.id, error: err.message });
        return res.status(500).json({ success: false, message: "Failed to fetch cart items" });
    }
};

const updateQuantity = async (req, res) => {
    try {
        const { productKey, delta } = req.body;

        if (
            typeof productKey !== "string" ||
            !productKey.trim() ||
            typeof delta !== "number" ||
            !Number.isInteger(delta) ||
            ![-1, 1].includes(delta)
        ) {
            return res.status(400).json({ success: false, message: "Invalid quantity update data" });
        }

        const safeProductKey = productKey.trim().slice(0, PRODUCT_KEY_MAX_LENGTH);
        const existingItem = await Cart.findOne({
            userId: String(req.user.id),
            productKey: safeProductKey
        });

        if (!existingItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        const nextQuantity = existingItem.quantity + delta;

        if (nextQuantity <= 0) {
            await existingItem.deleteOne();
        } else {
            existingItem.quantity = nextQuantity;
            await existingItem.save();
        }

        const { itemCount, totalAmount } = await getCartSummary(req.user.id);

        return res.json({
            success: true,
            itemCount,
            totalAmount,
            removed: nextQuantity <= 0,
            quantity: nextQuantity > 0 ? nextQuantity : 0
        });
    } catch (err) {
        console.error("Cart quantity update error:", {
            userId: req.user?.id,
            productKey: req.body?.productKey,
            error: err.message
        });
        return res.status(500).json({ success: false, message: "Failed to update cart quantity" });
    }
};

const renderCart = async (req, res) => {
    try {
        const items = await Cart.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        const { itemCount: totalItems, totalAmount } = await getCartSummary(req.user.id);

        res.render("cart", {
            items,
            totalItems,
            totalAmount
        });
    } catch (err) {
        console.error("Cart page error:", { userId: req.user?.id, error: err.message });
        res.status(500).send("Unable to load cart right now. Please try again.");
    }
};

module.exports = {
    addToCart,
    getSummary,
    getItems,
    updateQuantity,
    renderCart
};
