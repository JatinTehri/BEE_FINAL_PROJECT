const cartCountElement = document.querySelector(".cart-count");
const authStateElement = document.getElementById("auth-state");
const isLoggedIn = authStateElement?.dataset?.loggedin === "true";
const wishlistKeys = new Set();

const formatPriceToNumber = (priceText) => {
    if (!priceText) return 0;
    const match = priceText.replace(/,/g, "").match(/[0-9]+(?:\.[0-9]+)?/);
    const parsed = Number(match ? match[0] : 0);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const buildProductKey = (name, price, image) => {
    let imagePath = "";
    try {
        imagePath = image ? new URL(image, window.location.origin).pathname : "";
    } catch {
        imagePath = image || "";
    }

    const normalizedName = (name || "").trim().toLowerCase().replace(/\s+/g, "-");
    const normalizedImage = imagePath.trim().toLowerCase();

    return `${normalizedName}|${price}|${normalizedImage}`;
};

const getProductDetailsFromCard = (productCard) => {
    const productName = productCard?.querySelector(".product-name")?.textContent?.trim() || "Product";
    const productPriceText = productCard?.querySelector(".product-price")?.textContent?.trim() || "";
    const productImage = productCard?.querySelector(".product-image img")?.getAttribute("src") || "";
    const productPrice = formatPriceToNumber(productPriceText);
    const productKey = buildProductKey(productName, productPrice, productImage);

    return {
        productKey,
        name: productName,
        price: productPrice,
        image: productImage
    };
};

const applyWishlistIconState = (icon, isAdded) => {
    if (!icon) return;
    icon.classList.toggle("fa-solid", isAdded);
    icon.classList.toggle("fa-regular", !isAdded);
    icon.style.color = isAdded ? "#ff3f6c" : "";
};

const ensureWishlistIcons = () => {
    document.querySelectorAll(".product-card .product-image").forEach((productImage) => {
        if (productImage.querySelector(".wishlist-icon")) return;

        const wishlistContainer = document.createElement("div");
        wishlistContainer.className = "wishlist-icon auth-required";

        const icon = document.createElement("i");
        icon.className = "fa-regular fa-heart";

        wishlistContainer.appendChild(icon);

        const addToCartButton = productImage.querySelector(".add-to-cart");
        if (addToCartButton) {
            productImage.insertBefore(wishlistContainer, addToCartButton);
            return;
        }

        productImage.appendChild(wishlistContainer);
    });
};

const syncWishlistIcons = () => {
    ensureWishlistIcons();
    document.querySelectorAll(".wishlist-icon").forEach((wishlistContainer) => {
        const icon = wishlistContainer.querySelector("i");
        if (!icon) return;

        let productKey = wishlistContainer.dataset.productKey || "";
        if (!productKey) {
            const productCard = wishlistContainer.closest(".product-card");
            const product = getProductDetailsFromCard(productCard);
            productKey = product.productKey;
            wishlistContainer.dataset.productKey = productKey;
        }

        applyWishlistIconState(icon, wishlistKeys.has(productKey));
    });
};

const renderWishlistEmptyState = () => {
    const wishlistPage = document.querySelector(".wishlist-page");
    if (!wishlistPage) return;

    const hasCards = wishlistPage.querySelector(".product-card");
    if (hasCards) return;

    const existingGrid = wishlistPage.querySelector(".product-grid");
    if (existingGrid) {
        existingGrid.remove();
    }

    if (!wishlistPage.querySelector(".cart-empty")) {
        const emptyState = document.createElement("div");
        emptyState.className = "cart-empty";
        emptyState.innerHTML = `
            <p>Your wishlist is empty.</p>
            <a href="/men" class="btn-primary">Continue Shopping</a>
        `;
        wishlistPage.appendChild(emptyState);
    }
};

const updateCartCountBadge = (count) => {
    if (cartCountElement) {
        cartCountElement.textContent = String(count || 0);
    }
};

const redirectToLogin = () => {
    alert("Please login first to continue.");
    window.location.href = "/login";
};

const loadCartSummary = async () => {
    if (!isLoggedIn) {
        updateCartCountBadge(0);
        return;
    }

    try {
        const response = await fetch("/api/cart/summary");

        if (!response.ok) {
            updateCartCountBadge(0);
            return;
        }

        const data = await response.json();
        if (data?.success) {
            updateCartCountBadge(data.itemCount);
        }
    } catch {
        updateCartCountBadge(0);
    }
};

const updateCartQuantity = async (productKey, delta) => {
    const response = await fetch("/api/cart/quantity", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ productKey, delta })
    });

    if (response.status === 401) {
        redirectToLogin();
        return null;
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const error = new Error(data?.message || "Failed to update quantity");
        error.status = response.status;
        throw error;
    }

    return data;
};

const addToCart = async (product) => {
    const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(product)
    });

    if (response.status === 401) {
        redirectToLogin();
        return null;
    }

    if (!response.ok) {
        throw new Error("Failed to add item");
    }

    return response.json();
};

const handleAddToCartClick = async (button, event) => {
    event.preventDefault();

    if (!isLoggedIn) {
        redirectToLogin();
        return;
    }

    const productCard = button.closest(".product-card");
    const product = getProductDetailsFromCard(productCard);

    try {
        const data = await addToCart(product);

        if (data?.success) {
            updateCartCountBadge(data.itemCount);
            button.innerText = "Added ✓";
            setTimeout(() => {
                button.innerText = "Add to Bag";
            }, 1200);
        }
    } catch {
        alert("Unable to add to cart. Please try again.");
    }
};

const toggleWishlist = async (product) => {
    const response = await fetch("/api/wishlist/toggle", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(product)
    });

    if (response.status === 401) {
        redirectToLogin();
        return null;
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.message || "Failed to update wishlist");
    }

    return data;
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncWishlistIcons, { once: true });
} else {
    syncWishlistIcons();
}

const loadWishlistItems = async () => {
    if (!isLoggedIn) {
        wishlistKeys.clear();
        syncWishlistIcons();
        return;
    }

    try {
        const response = await fetch("/api/wishlist/items");
        if (!response.ok) {
            console.error("Wishlist load request failed:", response.status);
            return;
        }

        const data = await response.json();
        if (data?.success && Array.isArray(data.items)) {
            wishlistKeys.clear();
            data.items.forEach((item) => {
                if (item?.productKey) {
                    wishlistKeys.add(item.productKey);
                }
            });
            syncWishlistIcons();
        }
    } catch (error) {
        console.error("Wishlist load error:", error);
    }
};

const handleWishlistToggleClick = async (wishlistContainer, event) => {
    event.preventDefault();

    if (!isLoggedIn) {
        redirectToLogin();
        return;
    }

    const productCard = wishlistContainer.closest(".product-card");
    if (!productCard) return;

    const product = getProductDetailsFromCard(productCard);
    const icon = wishlistContainer.querySelector("i");

    wishlistContainer.dataset.productKey = product.productKey;

    try {
        const data = await toggleWishlist(product);
        if (!data?.success) return;

        if (data.added) {
            wishlistKeys.add(product.productKey);
        } else {
            wishlistKeys.delete(product.productKey);
        }

        syncWishlistIcons();

        if (!data.added && productCard.closest(".wishlist-page")) {
            productCard.remove();
            renderWishlistEmptyState();
        }
    } catch (error) {
        console.error("Wishlist toggle error:", error);
        applyWishlistIconState(icon, wishlistKeys.has(product.productKey));
        alert("Unable to update wishlist. Please try again.");
    }
};

document.addEventListener("click", (event) => {
    const addToCartButton = event.target.closest(".add-to-cart");
    if (addToCartButton) {
        handleAddToCartClick(addToCartButton, event);
        return;
    }

    const wishlistContainer = event.target.closest(".wishlist-icon");
    if (wishlistContainer) {
        handleWishlistToggleClick(wishlistContainer, event);
    }
});

const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");

if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        navMenu?.classList.toggle("active");
    });
}

const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
    } else {
        navbar.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
    }
});

document.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
            target.scrollIntoView({ behavior: "smooth" });
        }
    });
});

document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-5px)";
    });
    card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0px)";
    });
});

const searchForm = document.querySelector(".nav-search-form");
const searchIcon = document.querySelector(".search-icon");
const searchInput = document.querySelector(".search-input");

if (searchForm && searchIcon && searchInput) {
    searchIcon.addEventListener("click", (event) => {
        event.preventDefault();

        const query = searchInput.value.trim();
        const isInputActive = searchInput.classList.contains("active");

        if (isInputActive && query) {
            searchForm.submit();
            return;
        }

        searchInput.classList.toggle("active");
        if (searchInput.classList.contains("active")) {
            searchInput.focus();
        } else {
            searchInput.value = "";
        }
    });

    searchForm.addEventListener("submit", (event) => {
        if (!searchInput.value.trim()) {
            event.preventDefault();
        }
    });

    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            searchInput.classList.remove("active");
            searchInput.value = "";
            searchInput.blur();
        }
    });
}

const cartItemsList = document.querySelector(".cart-items-list");
const cartTotalItemsElement = document.getElementById("cart-total-items");
const cartTotalAmountElement = document.getElementById("cart-total-amount");
if (cartItemsList) {
    cartItemsList.addEventListener("click", async (event) => {
        const targetButton = event.target.closest(".cart-qty-btn");
        if (!targetButton) return;

        const itemCard = targetButton.closest(".cart-item-card");
        const productKey = itemCard?.dataset?.productKey;
        if (!productKey) return;

        const delta = targetButton.classList.contains("cart-increase-btn") ? 1 : -1;

        targetButton.disabled = true;
        try {
            const data = await updateCartQuantity(productKey, delta);
            if (data?.success) {
                updateCartCountBadge(data.itemCount);
                if (cartTotalItemsElement) {
                    cartTotalItemsElement.textContent = String(data.itemCount || 0);
                }
                if (cartTotalAmountElement) {
                    cartTotalAmountElement.textContent = Number(data.totalAmount || 0).toFixed(2);
                }

                if (data.removed) {
                    itemCard?.remove();
                    if (!cartItemsList.querySelector(".cart-item-card")) {
                        window.location.reload();
                    }
                } else {
                    const quantityValue = itemCard?.querySelector(".cart-quantity-value");
                    const subtotalElement = itemCard?.querySelector(".cart-item-subtotal");
                    const itemPrice = Number(itemCard?.dataset.price || 0);

                    if (quantityValue) {
                        quantityValue.textContent = String(data.quantity || 1);
                    }
                    if (subtotalElement) {
                        subtotalElement.textContent = (itemPrice * (data.quantity || 1)).toFixed(2);
                    }
                }
            }
        } catch (error) {
            if (error?.status === 404) {
                alert("This item is no longer in your cart.");
            } else if (error?.status === 500) {
                alert("Server error. Please try again shortly.");
            } else {
                alert(error?.message || "Unable to update quantity. Please try again.");
            }
        } finally {
            targetButton.disabled = false;
        }
    });
}

loadCartSummary();
loadWishlistItems();
