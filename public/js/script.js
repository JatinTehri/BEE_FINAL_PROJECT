const cartCountElement = document.querySelector(".cart-count");
const authStateElement = document.getElementById("auth-state");
const isLoggedIn = authStateElement?.dataset?.loggedin === "true";

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

document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", async (event) => {
        event.preventDefault();

        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }

        const productCard = button.closest(".product-card");
        const productName = productCard?.querySelector(".product-name")?.textContent?.trim() || "Product";
        const productPriceText = productCard?.querySelector(".product-price")?.textContent?.trim() || "";
        const productImage = productCard?.querySelector(".product-image img")?.getAttribute("src") || "";
        const productPrice = formatPriceToNumber(productPriceText);
        const productKey = buildProductKey(productName, productPrice, productImage);

        try {
            const data = await addToCart({
                productKey,
                name: productName,
                price: productPrice,
                image: productImage
            });

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
    });
});

document.querySelectorAll(".wishlist-icon i").forEach((icon) => {
    icon.addEventListener("click", () => {
        if (icon.classList.contains("fa-regular")) {
            icon.classList.remove("fa-regular");
            icon.classList.add("fa-solid");
            icon.style.color = "#ff3f6c";
        } else {
            icon.classList.remove("fa-solid");
            icon.classList.add("fa-regular");
            icon.style.color = "";
        }
    });
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

const searchIcon = document.querySelector(".search-icon");
const searchInput = document.querySelector(".search-input");
if (searchIcon) {
    searchIcon.addEventListener("click", () => {
        searchInput?.classList.toggle("active");
        searchInput?.focus();
    });
}

loadCartSummary();
