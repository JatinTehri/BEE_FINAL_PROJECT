const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { STRONG_PASSWORD_REGEX, STRONG_PASSWORD_ERROR } = require("../config/constants");

const renderLogin = (req, res) => {
    res.render("login", { title: "Login", error: null, success: null });
};

const renderSignup = (req, res) => {
    res.render("signup", { title: "Signup", error: null });
};

const handleSignup = async (req, res) => {
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
};

const handleLogin = async (req, res) => {
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
};

const handleLogout = (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
};

const handleGoogleCallback = (req, res) => {
    const token = jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie("token", token, { httpOnly: true });

    res.redirect("/");
};

module.exports = {
    renderLogin,
    renderSignup,
    handleSignup,
    handleLogin,
    handleLogout,
    handleGoogleCallback
};
