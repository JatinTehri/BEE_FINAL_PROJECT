const Wishlist = require("../models/Wishlist");
const {
    PRODUCT_KEY_MAX_LENGTH,
    PRODUCT_NAME_MAX_LENGTH,
    PRODUCT_IMAGE_MAX_LENGTH
} = require("../config/constants");

const toggleWishlist = async (req, res) => {
    try {
        const { productKey, name, price, image } = req.body;

        if (typeof productKey !== "string" || !productKey.trim()) {
            return res.status(400).json({ success: false, message: "Invalid product key" });
        }

        const safeProductKey = productKey.trim().slice(0, PRODUCT_KEY_MAX_LENGTH);
        const existingItem = await Wishlist.findOne({
            userId: String(req.user.id),
            productKey: safeProductKey
        });

        if (existingItem) {
            await existingItem.deleteOne();
            const itemCount = await Wishlist.countDocuments({ userId: String(req.user.id) });
            return res.json({ success: true, added: false, itemCount });
        }

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof price !== "number"
        ) {
            return res.status(400).json({ success: false, message: "Invalid wishlist product data" });
        }

        const normalizedPrice = Number(price);
        const safeName = name.trim().slice(0, PRODUCT_NAME_MAX_LENGTH);
        const safeImage = typeof image === "string" ? image.trim().slice(0, PRODUCT_IMAGE_MAX_LENGTH) : "";

        if (Number.isNaN(normalizedPrice) || normalizedPrice < 0) {
            return res.status(400).json({ success: false, message: "Invalid price" });
        }

        await Wishlist.create({
            userId: String(req.user.id),
            productKey: safeProductKey,
            name: safeName,
            price: normalizedPrice,
            image: safeImage
        });

        const itemCount = await Wishlist.countDocuments({ userId: String(req.user.id) });

        return res.json({
            success: true,
            added: true,
            itemCount
        });
    } catch (err) {
        console.error("Wishlist toggle error:", {
            userId: req.user?.id,
            productKey: req.body?.productKey,
            error: err.message
        });
        return res.status(500).json({ success: false, message: "Failed to update wishlist" });
    }
};

const getItems = async (req, res) => {
    try {
        const items = await Wishlist.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        return res.json({ success: true, items });
    } catch (err) {
        console.error("Wishlist items error:", { userId: req.user?.id, error: err.message });
        return res.status(500).json({ success: false, message: "Failed to fetch wishlist items" });
    }
};

const renderWishlist = async (req, res) => {
    try {
        const items = await Wishlist.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        res.render("wishlist", { items });
    } catch (err) {
        console.error("Wishlist page error:", { userId: req.user?.id, error: err.message });
        res.status(500).send("Unable to load wishlist right now. Please try again.");
    }
};

module.exports = {
    toggleWishlist,
    getItems,
    renderWishlist
};
