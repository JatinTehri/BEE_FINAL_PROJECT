const express = require("express");
const { toggleWishlist, getItems, renderWishlist } = require("../controllers/wishlistController");
const { authMiddleware, apiAuthMiddleware } = require("../middleware/auth");
const cartRateLimiter = require("../middleware/cartRateLimiter");
const sameOriginGuard = require("../middleware/sameOriginGuard");

const router = express.Router();

router.post("/api/wishlist/toggle", cartRateLimiter, apiAuthMiddleware, sameOriginGuard, toggleWishlist);
router.get("/api/wishlist/items", cartRateLimiter, apiAuthMiddleware, getItems);
router.get("/wishlist", cartRateLimiter, authMiddleware, renderWishlist);

module.exports = router;
