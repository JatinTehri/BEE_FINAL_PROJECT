const { SEARCH_QUERY_MAX_LENGTH } = require("../config/constants");
const { normalizeWhitespace, searchableProducts } = require("../services/searchService");

const renderHome = (req, res) => {
    res.render("home", { title: "Home Page" });
};

const renderSearch = (req, res) => {
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
};

const renderMen = (req, res) => res.render("men");
const renderWomen = (req, res) => res.render("women");
const renderKids = (req, res) => res.render("kids");
const renderBeauty = (req, res) => res.render("beauty");
const renderHomeLiving = (req, res) => res.render("home-living");

module.exports = {
    renderHome,
    renderSearch,
    renderMen,
    renderWomen,
    renderKids,
    renderBeauty,
    renderHomeLiving
};
