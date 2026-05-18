const express = require("express");
const passport = require("passport");
const {
    renderLogin,
    renderSignup,
    handleSignup,
    handleLogin,
    handleLogout,
    handleGoogleCallback
} = require("../controllers/authController");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/login", renderLogin);
router.get("/signup", renderSignup);
router.post("/signup", upload.single("profilePic"), handleSignup);
router.post("/login", handleLogin);
router.get("/logout", handleLogout);

router.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    handleGoogleCallback
);

module.exports = router;
