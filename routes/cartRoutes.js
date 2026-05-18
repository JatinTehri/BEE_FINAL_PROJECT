const express = require("express");
const {
    addToCart,
    getSummary,
    getItems,
    updateQuantity,
    renderCart
} = require("../controllers/cartController");
const { authMiddleware, apiAuthMiddleware } = require("../middleware/auth");
const cartRateLimiter = require("../middleware/cartRateLimiter");
const sameOriginGuard = require("../middleware/sameOriginGuard");

const router = express.Router();

router.post("/api/cart/add", cartRateLimiter, apiAuthMiddleware, sameOriginGuard, addToCart);
router.get("/api/cart/summary", cartRateLimiter, apiAuthMiddleware, getSummary);
router.get("/api/cart/items", cartRateLimiter, apiAuthMiddleware, getItems);
router.post("/api/cart/quantity", cartRateLimiter, apiAuthMiddleware, sameOriginGuard, updateQuantity);
router.get("/cart", cartRateLimiter, authMiddleware, renderCart);

module.exports = router;
