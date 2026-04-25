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

const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// MIDDLEWARE
// ============================

app.use(express.urlencoded({ extended: true }));
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
// SERVER
// ============================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});