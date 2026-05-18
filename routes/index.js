const express = require("express");
const authRoutes = require("./authRoutes");
const cartRoutes = require("./cartRoutes");
const pageRoutes = require("./pageRoutes");
const wishlistRoutes = require("./wishlistRoutes");

const router = express.Router();

router.use("/", pageRoutes);
router.use("/", authRoutes);
router.use("/", cartRoutes);
router.use("/", wishlistRoutes);

module.exports = router;
