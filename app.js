require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const connectDatabase = require("./config/db");
const configurePassport = require("./config/passport");
const attachUser = require("./middleware/setUser");
const routes = require("./routes");

const app = express();
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required to start the server.");
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(cookieParser());

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false
}));

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

connectDatabase();

app.use(attachUser);
app.use(routes);

module.exports = app;
