# EMMARKET POS Backend

The server-side application for the EMMARKET Point of Sale (POS) & Supermarket Inventory Management System. It is built using the Node.js runtime, Express.js web framework, and MongoDB with Mongoose ODM.

---

## Features

- **User Authentication**: Secure user login and authorization utilizing JSON Web Tokens (JWT) and blowfish password hashing (bcryptjs).
- **Inventory Control**: Models and endpoints for managing Categories, Units of Measure, and Products.
- **Cart Tracking**: Supports cashier interactions, tracking cart descriptions, individual item quantities, tax, and discount parameters.
- **Static Media Handling**: File upload setup powered by Multer for product images.
- **RESTful Endpoints**: Dedicated routes for structured operations across all primary modules.

---

## Technical Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB via Mongoose ODM
- **Media Storage**: Disk storage via Multer middleware
- **Security**: JWT & Bcryptjs
- **Development Tooling**: Nodemon for hot-reloading

---

## Installation & Setup

### Prerequisites

- Node.js installed on your machine.
- An active MongoDB cluster (local or MongoDB Atlas).

### Installation Steps

1. Clone or navigate to the backend repository directory:
   ```bash
   cd POS-Backend-main/POS-Backend-main
   ```

2. Install all required dependencies:
   ```bash
   npm install
   ```

3. Configure your Environment Variables:
   Create a `.env` file in the root of the backend directory and configure the database link:
   ```env
   MONGOPATH="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/<dbname>?retryWrites=true&w=majority"
   ```

4. Run the development server:
   ```bash
   npm start
   ```
   The backend connects to your database and listens for requests on port `5500`.

---

## API Endpoints Map

### Users (`/user`)
- `POST /user/login` - Authenticate cashier credentials and receive a JWT.
- `POST /user/signup` - Register a new cashier profile (standard/admin).
- `GET /user` - Retrieve all registered cashier accounts.
- `DELETE /user/:id` - Remove a user profile (requires administrative flag).

### Categories (`/category`)
- `POST /category` - Create a new product category.
- `GET /category` - Fetch list of all product categories.
- `PUT /category/:id` - Update category details.
- `DELETE /category/:id` - Delete a category.

### Units of Measure (`/unit`)
- `POST /unit` - Register a new unit (e.g., Kg, Litre, Box).
- `GET /unit` - Retrieve all units of measure.
- `PUT /unit/:id` - Modify unit definitions and conversion factors.
- `DELETE /unit/:id` - Remove a unit of measure.

### Products (`/product`)
- `POST /product` - Add a new product (handles product image upload via multipart/form-data).
- `GET /product` - Fetch all products in the database.
- `PUT /product/:id` - Update product attributes.
- `DELETE /product/:id` - Delete a product.

### Carts (`/cart`)
- `POST /cart` - Register a new checkout cart.
- `GET /cart` - Retrieve all shopping carts.
- `GET /cart/:id` - Get details of a single cart.
- `PUT /cart/:id` - Modify shopping cart details (items, discounts, tax rates, descriptions).
- `DELETE /cart/:id` - Remove a cart from active status.

---

## Folder Structure

```
├── controller          # Core route controller handlers
├── middleware          # Authentication and upload middlewares
├── model               # Mongoose schemas (User, Product, Cart, etc.)
├── routes              # Express API routers
├── uploads             # Static folder holding uploaded product images
├── .env                # Database configurations (ignored)
├── server.js           # Express app setup and Database connection logic
└── package.json        # Dependencies list
```
