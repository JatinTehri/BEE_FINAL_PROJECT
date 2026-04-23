// document.addEventListener('DOMContentLoaded', () => {

//     updateCounters();

//     const authElement = document.getElementById('auth-status');
//     let isLoggedIn = false;

//     if (authElement) {
//         isLoggedIn = authElement.value === 'true';
//     }

//     const requireLogin = (action) => {
//         if (!isLoggedIn) {
//             alert("Please login to continue!");
//             window.location.href = "/login";
//         } else {
//             action();
//         }
//     };

//     // ADD TO CART

//     document.querySelectorAll('.add-to-cart').forEach(btn => {

//         btn.addEventListener('click', () => {

//             requireLogin(() => {

//                 let cart = JSON.parse(localStorage.getItem('cart')) || [];

//                 cart.push({
//                     id: Date.now()
//                 });

//                 localStorage.setItem('cart', JSON.stringify(cart));

//                 updateCounters();

//                 alert("Product added to cart!");

//             });

//         });

//     });

//     // WISHLIST

//     document.querySelectorAll('.wishlist-icon').forEach(icon => {

//         icon.addEventListener('click', () => {

//             requireLogin(() => {

//                 let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

//                 wishlist.push({
//                     id: Date.now()
//                 });

//                 localStorage.setItem('wishlist', JSON.stringify(wishlist));

//                 updateCounters();

//                 const heart = icon.querySelector('i');

//                 heart.classList.remove('fa-regular');
//                 heart.classList.add('fa-solid');
//                 heart.style.color = "red";

//             });

//         });

//     });

// });

// function updateCounters() {

//     const cart = JSON.parse(localStorage.getItem('cart')) || [];
//     const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

//     const cartCount = document.getElementById('cart-count');
//     const wishCount = document.getElementById('wish-count');

//     if (cartCount) {
//         cartCount.innerText = cart.length;
//     }

//     if (wishCount) {
//         wishCount.innerText = wishlist.length;
//     }

// }


/* ================================
   VYBE E-COMMERCE MAIN JAVASCRIPT
================================ */

/* CART COUNT */
let cartCount = 0;


/* ================================
   ADD TO CART FUNCTION
================================ */

const addToCartButtons = document.querySelectorAll(".add-to-cart");
const cartCountElement = document.querySelector(".cart-count");

addToCartButtons.forEach((button) => {

    button.addEventListener("click", () => {

        cartCount++;

        if(cartCountElement){
            cartCountElement.textContent = cartCount;
        }

        button.innerText = "Added ✓";

        setTimeout(()=>{
            button.innerText = "Add to Bag";
        },1500)

    });

});


/* ================================
   WISHLIST HEART TOGGLE
================================ */

const wishlistIcons = document.querySelectorAll(".wishlist-icon i");

wishlistIcons.forEach(icon => {

    icon.addEventListener("click", () => {

        if(icon.classList.contains("fa-regular")){
            icon.classList.remove("fa-regular");
            icon.classList.add("fa-solid");
            icon.style.color = "#ff3f6c";
        }
        else{
            icon.classList.remove("fa-solid");
            icon.classList.add("fa-regular");
            icon.style.color = "";
        }

    });

});


/* ================================
   MOBILE MENU TOGGLE
================================ */

const menuToggle = document.querySelector(".menu-toggle");
const navMenu = document.querySelector(".nav-menu");

if(menuToggle){

    menuToggle.addEventListener("click", () => {

        navMenu.classList.toggle("active");

    });

}


/* ================================
   NAVBAR SHADOW ON SCROLL
================================ */

const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {

    if(window.scrollY > 50){
        navbar.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
    }
    else{
        navbar.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
    }

});


/* ================================
   SMOOTH SCROLLING
================================ */

const links = document.querySelectorAll("a[href^='#']");

links.forEach(link => {

    link.addEventListener("click", function(e){

        e.preventDefault();

        const target = document.querySelector(this.getAttribute("href"));

        if(target){
            target.scrollIntoView({
                behavior: "smooth"
            });
        }

    });

});


/* ================================
   PRODUCT CARD HOVER EFFECT
================================ */

const productCards = document.querySelectorAll(".product-card");

productCards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-5px)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "translateY(0px)";

    });

});

/* ================================
   SEARCH BAR TOGGLE
================================ */

const searchIcon = document.querySelector(".search-icon");
const searchInput = document.querySelector(".search-input");

if(searchIcon){

searchIcon.addEventListener("click",()=>{

searchInput.classList.toggle("active");
searchInput.focus();

});

}