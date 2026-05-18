const express = require("express");
const {
    renderHome,
    renderSearch,
    renderMen,
    renderWomen,
    renderKids,
    renderBeauty,
    renderHomeLiving
} = require("../controllers/pageController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.get("/", renderHome);
router.get("/search", renderSearch);
router.get("/men", authMiddleware, renderMen);
router.get("/women", authMiddleware, renderWomen);
router.get("/kids", authMiddleware, renderKids);
router.get("/beauty", authMiddleware, renderBeauty);
router.get("/home-living", authMiddleware, renderHomeLiving);

module.exports = router;
