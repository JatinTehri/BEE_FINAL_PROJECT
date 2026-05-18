const fs = require("fs");
const path = require("path");

const SEARCH_CARD_REGEX = /<div class="product-card"[\s\S]*?<div class="product-info">[\s\S]*?<\/div>\s*<\/div>/g;
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
            const templatePath = path.join(__dirname, "..", "views", page.template);
            products.push(...extractProductsFromTemplate(templatePath, page.route, page.category));
        } catch (error) {
            console.error(`Search indexing failed for ${page.template}:`, error.message);
        }
    }

    return products;
};

const searchableProducts = getSearchableProducts();

module.exports = {
    normalizeWhitespace,
    searchableProducts
};
