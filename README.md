# Vybe

Vybe is a full-stack fashion and lifestyle e-commerce website built with
Node.js, Express, MongoDB, and EJS. Users can browse product categories,
search the catalog, create an account, sign in with Google, manage a cart, and
save products to a wishlist.

## Features

- Responsive storefront with Home, Men, Women, Kids, Beauty, and Home & Living
  categories
- Catalog search across the product pages
- Username/password registration and login
- Secure password hashing with `bcryptjs`
- Google OAuth 2.0 authentication with Passport
- JWT-based authentication stored in an HTTP-only cookie
- Profile-picture upload during registration
- Cart management with quantity updates and cart summary APIs
- Wishlist toggle and wishlist page
- MongoDB persistence through Mongoose
- Request validation, same-origin protection, and cart rate limiting

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Runtime | Node.js |
| Server | Express 5 |
| Views | EJS |
| Database | MongoDB and Mongoose |
| Authentication | JWT, sessions, Passport, Google OAuth 2.0 |
| Frontend | HTML, CSS, and vanilla JavaScript |

## Requirements

- Node.js 18 or newer
- npm
- MongoDB (local or hosted, such as MongoDB Atlas)
- Google OAuth credentials if Google sign-in is enabled

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/JatinTehri/BEE_FINAL_PROJECT.git
cd BEE_FINAL_PROJECT
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://127.0.0.1:27017/vybe
JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters-long
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
PORT=3000
```

`MONGO_URI`, `JWT_SECRET`, and `SESSION_SECRET` are required. The session
secret must contain at least 32 characters. The Google OAuth variables are
also required by the current application startup configuration, even if you
do not use Google sign-in.

For local Google OAuth testing, add this callback URL in the Google Cloud
Console:

```text
http://localhost:3000/auth/google/callback
```

### 4. Start the server

```bash
node server.js
```

The application is available at [http://localhost:3000](http://localhost:3000)
unless a different `PORT` is configured.

For development, you can use Nodemon:

```bash
npx nodemon server.js
```

## Application Routes

### Pages

| Method | Route | Description |
| --- | --- | --- |
| GET | `/` | Home page |
| GET | `/search` | Search results |
| GET | `/men` | Men's products |
| GET | `/women` | Women's products |
| GET | `/kids` | Kids' products |
| GET | `/beauty` | Beauty products |
| GET | `/home-living` | Home and living products |
| GET | `/cart` | Current user's cart |
| GET | `/wishlist` | Current user's wishlist |

Category, cart, and wishlist pages require authentication where applicable.

### Authentication

| Method | Route | Description |
| --- | --- | --- |
| GET | `/login` | Login page |
| POST | `/login` | Username/password login |
| GET | `/signup` | Registration page |
| POST | `/signup` | Create an account |
| GET | `/logout` | Log out |
| GET | `/auth/google` | Start Google OAuth |
| GET | `/auth/google/callback` | Handle Google OAuth callback |

### Cart and wishlist APIs

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/cart/add` | Add a product to the cart |
| GET | `/api/cart/summary` | Get cart totals and item count |
| GET | `/api/cart/items` | Get cart items |
| POST | `/api/cart/quantity` | Update a cart-item quantity |
| POST | `/api/wishlist/toggle` | Add or remove a wishlist item |
| GET | `/api/wishlist/items` | Get wishlist items |

The cart and wishlist API endpoints require an authenticated user and accept
JSON or URL-encoded request data as used by the frontend.

## Project Structure

```text
.
├── app.js                 # Express application configuration
├── server.js              # Application entry point
├── config/                # Database, Passport, and shared constants
├── controllers/           # Request handlers
├── middleware/            # Authentication, uploads, and request guards
├── models/                # Mongoose schemas
├── routes/                # Page, auth, cart, and wishlist routes
├── services/              # Search and cart business logic
├── public/                # Stylesheets, client-side scripts, and images
└── views/                 # EJS page templates and partials
```

## Security Notes

- Never commit `.env` or expose OAuth client secrets.
- Use strong, unique values for `JWT_SECRET` and `SESSION_SECRET`.
- Use HTTPS and secure cookie settings when deploying outside local
  development.
- Restrict the Google OAuth callback URL to the domains used by the deployed
  application.

## Development

The project currently does not define an automated test suite. Before opening
a pull request, verify the main flows manually: registration, login, Google
sign-in, category access, search, cart updates, wishlist updates, and logout.

## License

This project is provided for educational and demonstration purposes.
