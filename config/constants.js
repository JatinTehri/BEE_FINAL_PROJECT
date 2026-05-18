const CART_WINDOW_MS = 60 * 1000;
const CART_MAX_REQUESTS = 60;
const PRODUCT_KEY_MAX_LENGTH = 200;
const PRODUCT_NAME_MAX_LENGTH = 200;
const PRODUCT_IMAGE_MAX_LENGTH = 2000;
const SEARCH_QUERY_MAX_LENGTH = 100;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const STRONG_PASSWORD_ERROR = "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.";

module.exports = {
    CART_WINDOW_MS,
    CART_MAX_REQUESTS,
    PRODUCT_KEY_MAX_LENGTH,
    PRODUCT_NAME_MAX_LENGTH,
    PRODUCT_IMAGE_MAX_LENGTH,
    SEARCH_QUERY_MAX_LENGTH,
    STRONG_PASSWORD_REGEX,
    STRONG_PASSWORD_ERROR
};
