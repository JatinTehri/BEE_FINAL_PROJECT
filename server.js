require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// 🔥 GOOGLE LOGIN
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");

const User = require("./models/User");
const Cart = require("./models/Cart");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// MIDDLEWARE
// ============================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(cookieParser());

// 🔥 SESSION (ONLY FOR GOOGLE)
app.use(session({
    secret: "googleAuthSecret",
    resave: false,
    saveUninitialized: false
}));

// 🔥 PASSPORT INIT
app.use(passport.initialize());
app.use(passport.session());

// ============================
// VIEW ENGINE
// ============================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ============================
// MULTER
// ============================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// ============================
// DATABASE
// ============================

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ============================
// GOOGLE STRATEGY
// ============================

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
            user = await User.create({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                username: profile.emails[0].value,
                profilePic: profile.photos[0].value
            });
        }

        return done(null, user);

    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// ============================
// JWT AUTH MIDDLEWARE
// ============================

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) return res.redirect("/login");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.redirect("/login");
    }
};

const apiAuthMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
};

const cartRateLimitStore = new Map();
const CART_WINDOW_MS = 60 * 1000;
const CART_MAX_REQUESTS = 60;

const cartRateLimiter = (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = cartRateLimitStore.get(key);

    if (!entry || now - entry.start > CART_WINDOW_MS) {
        cartRateLimitStore.set(key, { start: now, count: 1 });
        return next();
    }

    if (entry.count >= CART_MAX_REQUESTS) {
        return res.status(429).json({ success: false, message: "Too many requests" });
    }

    entry.count += 1;
    cartRateLimitStore.set(key, entry);
    next();
};

const sameOriginGuard = (req, res, next) => {
    const origin = req.get("origin");
    const host = req.get("host");

    if (!origin || !host) return next();

    try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
            return res.status(403).json({ success: false, message: "Invalid request origin" });
        }
    } catch {
        return res.status(403).json({ success: false, message: "Invalid request origin" });
    }

    next();
};

// ============================
// GLOBAL USER (FOR HEADER)
// ============================

app.use(async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        res.locals.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        res.locals.user = user || null;

    } catch {
        res.locals.user = null;
    }

    next();
});

// ============================
// ROUTES
// ============================

// HOME
app.get("/", (req, res) => {
    res.render("home", { title: "Home Page" });
});

// LOGIN
app.get("/login", (req, res) => {
    res.render("login", { title: "Login", error: null, success: null });
});

// SIGNUP
app.get("/signup", (req, res) => {
    res.render("signup", { title: "Signup", error: null });
});

// ============================
// GOOGLE LOGIN ROUTES
// ============================

// 🔥 START GOOGLE LOGIN
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// 🔥 GOOGLE CALLBACK
app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    async (req, res) => {

        // ✅ CREATE JWT
        const token = jwt.sign(
            { id: req.user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true
        });

        res.redirect("/");
    }
);

// ============================
// SIGNUP
// ============================

app.post("/signup", upload.single("profilePic"), async (req, res) => {

    const { name, email, username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render("signup", {
            title: "Signup",
            error: "Passwords do not match!"
        });
    }

    try {
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.render("signup", {
                title: "Signup",
                error: "Email or Username already exists!"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            username,
            password: hashedPassword,
            profilePic: req.file ? req.file.filename : null
        });

        await newUser.save();

        res.render("login", {
            title: "Login",
            success: "Account created successfully!",
            error: null
        });

    } catch (err) {
        console.log(err);
        res.send("Error occurred");
    }
});

// ============================
// NORMAL LOGIN (JWT)
// ============================

app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.render("login", {
                title: "Login",
                error: "User not found!",
                success: null
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.render("login", {
                title: "Login",
                error: "Wrong password!",
                success: null
            });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true
        });

        res.redirect("/");

    } catch (err) {
        console.log(err);
        res.send("Error occurred");
    }
});

// ============================
// LOGOUT
// ============================

app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
});

// ============================
// PROTECTED ROUTES
// ============================

app.get("/men", authMiddleware, (req, res) => res.render("men"));
app.get("/women", authMiddleware, (req, res) => res.render("women"));
app.get("/kids", authMiddleware, (req, res) => res.render("kids"));
app.get("/beauty", authMiddleware, (req, res) => res.render("beauty"));
app.get("/home-living", authMiddleware, (req, res) => res.render("home-living"));

// ============================
// CART ROUTES
// ============================

app.post("/api/cart/add", cartRateLimiter, apiAuthMiddleware, sameOriginGuard, async (req, res) => {
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
        const safeProductKey = productKey.trim().slice(0, 200);
        const safeName = name.trim().slice(0, 200);
        const safeImage = typeof image === "string" ? image.trim().slice(0, 2000) : "";

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

        const cartItems = await Cart.find({ userId: String(req.user.id) });
        const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return res.json({
            success: true,
            itemCount,
            totalAmount
        });
    } catch (err) {
        console.log("Cart add error:", {
            userId: req.user?.id,
            productKey: req.body?.productKey,
            error: err.message
        });
        return res.status(500).json({ success: false, message: "Failed to add to cart" });
    }
});

app.get("/api/cart/summary", cartRateLimiter, apiAuthMiddleware, async (req, res) => {
    try {
        const cartItems = await Cart.find({ userId: String(req.user.id) });
        const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return res.json({
            success: true,
            itemCount,
            totalAmount
        });
    } catch (err) {
        console.log("Cart summary error:", { userId: req.user?.id, error: err.message });
        return res.status(500).json({ success: false, message: "Failed to fetch cart summary" });
    }
});

app.get("/api/cart/items", cartRateLimiter, apiAuthMiddleware, async (req, res) => {
    try {
        const items = await Cart.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        return res.json({ success: true, items });
    } catch (err) {
        console.log("Cart items error:", { userId: req.user?.id, error: err.message });
        return res.status(500).json({ success: false, message: "Failed to fetch cart items" });
    }
});

app.get("/cart", cartRateLimiter, authMiddleware, async (req, res) => {
    try {
        const items = await Cart.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        res.render("cart", {
            items,
            totalItems,
            totalAmount
        });
    } catch (err) {
        console.log("Cart page error:", { userId: req.user?.id, error: err.message });
        res.status(500).send("Unable to load cart right now. Please try again.");
    }
});

// ============================
// SERVER
// ============================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
