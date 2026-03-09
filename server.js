const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "users.json");

// store logged user
let currentUser = null;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Logger middleware
app.use((req, res, next) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${req.method} request to: ${req.url}`);
    next();
});

// make user available to all EJS templates
app.use((req, res, next) => {
    res.locals.user = currentUser;
    next();
});

// ============================
// Helper Function
// ============================

function readUsers() {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        if (!data) return [];
        return JSON.parse(data);
    }
    return [];
}

// ============================
// AUTH ROUTES
// ============================

// Login Page
app.get("/login", (req, res) => {
    res.render("login", { title: "Login", error: null, success: null });
});

// Signup Page
app.get("/signup", (req, res) => {
    res.render("signup", { title: "Signup", error: null, success: null });
});

// Handle Signup
app.post("/signup", (req, res) => {

    const { signupName, signupEmail, signupPhone, signupPassword, signupConfirmPassword } = req.body;

    if (signupPassword !== signupConfirmPassword) {
        return res.render("signup", {
            title: "Signup",
            error: "Passwords do not match!",
            success: null
        });
    }

    let users = readUsers();

    const existingUser = users.find(u => u.email === signupEmail);

    if (existingUser) {
        return res.render("signup", {
            title: "Signup",
            error: "Email already exists!",
            success: null
        });
    }

    const newUser = {
        id: Date.now().toString(),
        name: signupName,
        email: signupEmail,
        phone: signupPhone,
        pwd: signupPassword
    };

    users.push(newUser);

    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));

    res.render("login", {
        title: "Login",
        error: null,
        success: "Account created successfully! Please login."
    });

});

// Handle Login
app.post("/login", (req, res) => {

    const email = req.body.loginEmail;
    const pwd = req.body.loginPassword;

    const users = readUsers();

    const user = users.find(u => u.email === email && u.pwd === pwd);

    if (user) {

        // save logged user
        currentUser = user.name;

        res.redirect("/");

    } else {

        res.render("login", {
            title: "Login",
            error: "Invalid email or password!",
            success: null
        });

    }

});

// Logout
app.get("/logout", (req, res) => {
    currentUser = null;
    res.redirect("/");
});

// ============================
// WEBSITE PAGES
// ============================

// Home
app.get("/", (req, res) => {
    res.render("home", { title: "Home Page" });
});

// Men
app.get("/men", (req, res) => {
    res.render("men", { title: "Men Collection" });
});

// Women
app.get("/women", (req, res) => {
    res.render("women", { title: "Women Collection" });
});

// Kids
app.get("/kids", (req, res) => {
    res.render("kids", { title: "Kids Collection" });
});

// Home Living
app.get("/home-living", (req, res) => {
    res.render("home-living", { title: "Home & Living" });
});

// Beauty
app.get("/beauty", (req, res) => {
    res.render("beauty", { title: "Beauty" });
});

// ============================
// 404 PAGE
// ============================

app.use((req, res) => {
    res.status(404).send("<h1>404 Page Not Found</h1>");
});

// ============================
// SERVER
// ============================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});