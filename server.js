require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
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
const Wishlist = require("./models/Wishlist");

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

// 🔥 SESSION (only needed for Google)
app.use(session({
    secret: "googleAuthSecret",
    resave: false,
    saveUninitialized: false
}));

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
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// ============================
// DATABASE
// ============================

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ============================
// 🔥 GOOGLE STRATEGY (ONLY HERE)
// ============================

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
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

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// ============================
// JWT AUTH
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
const PRODUCT_KEY_MAX_LENGTH = 200;
const PRODUCT_NAME_MAX_LENGTH = 200;
const PRODUCT_IMAGE_MAX_LENGTH = 2000;
const SEARCH_QUERY_MAX_LENGTH = 100;
const SEARCH_CARD_REGEX = /<div class="product-card"[\s\S]*?<div class="product-info">[\s\S]*?<\/div>\s*<\/div>/g;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const STRONG_PASSWORD_ERROR = "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.";
const SEARCHABLE_PRODUCT_PAGES = [
    { route: "/", category: "Home", template: "home.ejs" },
    { route: "/men", category: "Men", template: "men.ejs" },
    { route: "/women", category: "Women", template: "women.ejs" },
    { route: "/kids", category: "Kids", template: "kids.ejs" },
    { route: "/home-living", category: "Home & Living", template: "home-living.ejs" },
    { route: "/beauty", category: "Beauty", template: "beauty.ejs" }
];

const normalizeWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();
const cleanText = (value = "") => normalizeWhitespace(value.replace(/<[^>]*>/g, " "));

const extractProductsFromTemplate = (templatePath, route, category) => {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    const cards = [...templateContent.matchAll(SEARCH_CARD_REGEX)];

    return cards
        .map((card) => {
            const cardHtml = card[0];
            const name = cleanText(cardHtml.match(/class="product-name"[^>]*>([\s\S]*?)<\/(?:div|p)>/)?.[1] || "");
            const brand = cleanText(cardHtml.match(/class="brand"[^>]*>([\s\S]*?)<\/(?:div|h4)>/)?.[1] || "");
            const price = cleanText(cardHtml.match(/class="product-price"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "");
            const image = cardHtml.match(/<img[^>]*src="([^"]+)"/)?.[1] || "";

            if (!name) return null;

            return {
                name,
                brand,
                price,
                image,
                route,
                category
            };
        })
        .filter(Boolean);
};

const getSearchableProducts = () => {
    const products = [];

    for (const page of SEARCHABLE_PRODUCT_PAGES) {
        try {
            const templatePath = path.join(__dirname, "views", page.template);
            products.push(...extractProductsFromTemplate(templatePath, page.route, page.category));
        } catch (error) {
            console.error(`Search indexing failed for ${page.template}:`, error.message);
        }
    }

    return products;
};

const searchableProducts = getSearchableProducts();

const getCartSummary = async (userId) => {
    const summary = await Cart.aggregate([
        { $match: { userId: String(userId) } },
        {
            $group: {
                _id: null,
                itemCount: { $sum: "$quantity" },
                totalAmount: { $sum: { $multiply: ["$price", "$quantity"] } }
            }
        }
    ]);

    return {
        itemCount: summary[0]?.itemCount || 0,
        totalAmount: summary[0]?.totalAmount || 0
    };
};

const cartRateLimiter = (req, res, next) => {
    const staleThreshold = Date.now() - CART_WINDOW_MS;
    for (const [storedKey, entry] of cartRateLimitStore.entries()) {
        if (entry.start < staleThreshold) {
            cartRateLimitStore.delete(storedKey);
        }
    }

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

app.get("/search", (req, res) => {
    const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
    const query = normalizeWhitespace(rawQuery).slice(0, SEARCH_QUERY_MAX_LENGTH);
    const normalizedQuery = query.toLowerCase();

    const results = normalizedQuery
        ? searchableProducts.filter((product) => {
            return [product.name, product.brand, product.category].some((field) =>
                field.toLowerCase().includes(normalizedQuery)
            );
        })
        : [];

    res.render("search", {
        title: "Search",
        query,
        results
    });
});

// LOGIN PAGE
app.get("/login", (req, res) => {
    res.render("login", { title: "Login", error: null, success: null });
});

// SIGNUP PAGE
app.get("/signup", (req, res) => {
    res.render("signup", { title: "Signup", error: null });
});

// ============================
// 🔥 GOOGLE LOGIN ROUTES
// ============================

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    async (req, res) => {

        const token = jwt.sign(
            { id: req.user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, { httpOnly: true });

        res.redirect("/");
    }
);

// ============================
// SIGNUP
// ============================

app.post("/signup", upload.single("profilePic"), async (req, res) => {

    const { name, email, username, password, confirmPassword } = req.body;

    if (!STRONG_PASSWORD_REGEX.test(password)) {
        return res.render("signup", {
            title: "Signup",
            error: STRONG_PASSWORD_ERROR
        });
    }

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

        res.cookie("token", token, { httpOnly: true });

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
});

app.get("/api/cart/summary", cartRateLimiter, apiAuthMiddleware, async (req, res) => {
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
});

app.get("/api/cart/items", cartRateLimiter, apiAuthMiddleware, async (req, res) => {
    try {
        const items = await Cart.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        return res.json({ success: true, items });
    } catch (err) {
        console.error("Cart items error:", { userId: req.user?.id, error: err.message });
        return res.status(500).json({ success: false, message: "Failed to fetch cart items" });
    }
});

app.post("/api/cart/quantity", cartRateLimiter, apiAuthMiddleware, sameOriginGuard, async (req, res) => {
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
});

app.get("/cart", cartRateLimiter, authMiddleware, async (req, res) => {
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
});

// ============================
// WISHLIST ROUTES
// ============================

app.post("/api/wishlist/toggle", cartRateLimiter, apiAuthMiddleware, sameOriginGuard, async (req, res) => {
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
});

app.get("/api/wishlist/items", cartRateLimiter, apiAuthMiddleware, async (req, res) => {
    try {
        const items = await Wishlist.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        return res.json({ success: true, items });
    } catch (err) {
        console.error("Wishlist items error:", { userId: req.user?.id, error: err.message });
        return res.status(500).json({ success: false, message: "Failed to fetch wishlist items" });
    }
});

app.get("/wishlist", cartRateLimiter, authMiddleware, async (req, res) => {
    try {
        const items = await Wishlist.find({ userId: String(req.user.id) }).sort({ createdAt: -1 });
        res.render("wishlist", { items });
    } catch (err) {
        console.error("Wishlist page error:", { userId: req.user?.id, error: err.message });
        res.status(500).send("Unable to load wishlist right now. Please try again.");
    }
});

// ============================
// SERVER
// ============================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
