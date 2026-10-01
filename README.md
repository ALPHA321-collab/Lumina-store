# LUMINA Studio — Full-Stack E-Commerce Platform (Enhanced)

A production-ready, full-stack online storefront featuring a modern frontend coupled with a robust Python Flask REST API and SQLite database engine (`lumina.db`).

## ✨ New Features (v2)

- **Customer & Owner Login / Register** with token-based auth
  - Customer: register, login, view own order history
  - Owner: exclusive access to Store Operations dashboard
  - Demo Owner: `owner@lumina.pk` / `Owner@123`
  - Demo Customer: `customer@example.com` / `Customer1`
- **Store Operations restricted to Owner login only**
- **Real-time order tracking** with status history timestamps
- **Proper transaction records** (JazzCash, EasyPaisa, COD, Credit Card, Bank Transfer)
- **Interactive map of warehouses** across Pakistan cities (Karachi, Lahore, Islamabad, Peshawar, Multan, Faisalabad, Quetta, Rawalpindi) using Leaflet
- **Extra APIs**: `/api/auth/*`, `/api/warehouses`, `/api/my/orders`, `/api/transactions`, `/api/admin/advance-order`

---

---

## 🏗️ Architecture & Full-Stack Connectivity

```
[ Frontend: HTML5 / CSS3 / Vanilla JS (ES6+) ]
                    ↕ (HTTP REST API / JSON)
[ Backend Server: Python 3.13 + Flask + Flask-CORS (`server.py`) ]
                    ↕ (SQL Queries / Transactions)
[ Database: SQLite3 (`lumina.db`) with Foreign Keys & Automatic Seeding ]
```

- **Frontend (`index.html`, `js/app.js`, `css/styles.css`)**:
  - Dynamically fetches catalog items from `/api/products` with live stock counts and variant data.
  - Cart calculation and real-time coupon verification against `/api/promo/validate`.
  - Secure order checkout dispatching real orders to `/api/orders` with inventory decrement.
  - Interactive Order Tracking modal querying `/api/orders/<order_number>` displaying shipment milestones.
  - Studio Concierge support modal connected to `/api/contact`.
  - Customer review submission modal connected to `/api/testimonials`.
  - Built-in Store Operations & Admin Dashboard connected to `/api/admin/dashboard`.
  - Live backend connection status pill in top bar with automatic health checks.

- **Backend (`server.py`, `database.py`)**:
  - Modular Flask application serving static assets and JSON REST APIs.
  - Thread-safe SQLite connection manager with normalized tables, constraints, and JSON fields.
  - Fully automated database seeding on initial launch.

---

## 🗄️ Database Schema (`lumina.db`)

1. **`products`**:
   - `id`, `name`, `tagline`, `category`, `category_label`, `price`, `original_price`, `rating`, `reviews_count`, `badge`, `badge_type`, `image`, `gallery` (JSON), `colors` (JSON), `sizes` (JSON), `description`, `features` (JSON), `in_stock`, `stock_count`, `is_featured`, `created_at`.
2. **`orders`**:
   - `id`, `order_number` (e.g. `LUM-742918`), `customer_name`, `customer_email`, `street_address`, `city`, `zip_code`, `subtotal`, `discount`, `shipping`, `total`, `promo_code`, `payment_method`, `status` (`Confirmed`, `Processing`, `In Transit`, `Delivered`), `tracking_carrier`, `estimated_delivery`, `created_at`.
3. **`order_items`**:
   - `id`, `order_id`, `product_id`, `product_name`, `product_image`, `price`, `quantity`, `color`, `size`, `total`.
4. **`promo_codes`**:
   - `id`, `code` (`LUMINA20`, `WELCOME10`, `FREESHIP`), `discount_percent`, `discount_fixed`, `free_shipping`, `description`, `min_order`, `is_active`.
5. **`newsletter_subscribers`**:
   - `id`, `email`, `discount_code`, `created_at`.
6. **`testimonials`**:
   - `id`, `author`, `role`, `avatar`, `rating`, `date_str`, `text`, `product`, `created_at`.
7. **`contact_messages`**:
   - `id`, `name`, `email`, `subject`, `message`, `status`, `created_at`.

---

## 📡 Complete REST API Reference

### 1. Products & Catalog
- `GET /api/products`: Filter by `category`, `search`, `in_stock`, and `sort` (`featured`, `price-asc`, `price-desc`, `rating`).
- `GET /api/products/<id>`: Retrieve detailed product specifications.
- `POST /api/products`: Create a new product.
- `PUT /api/products/<id>`: Update product attributes, price, or live stock quantity.
- `DELETE /api/products/<id>`: Delete product.
- `GET /api/categories`: Returns categories with product counts.

### 2. Promotional Vouchers & Cart
- `POST /api/promo/validate`: Validates code (e.g., `LUMINA20`, `WELCOME10`, `FREESHIP`) and computes discount against current subtotal.
- `GET /api/promo`: Lists all promotional campaigns.
- `POST /api/cart/calculate`: Computes server-verified subtotal, free shipping threshold ($100), discount amount, and final total.

### 3. Orders & Real-time Tracking
- `POST /api/orders`: Submits checkout, validates input, checks and decrements inventory in SQLite, records order & line items, and returns unique order number.
- `GET /api/orders`: Retrieves recent orders with customer information and items.
- `GET /api/orders/<order_number_or_email>`: Fetches shipment milestones (`Order Confirmed` -> `Artisan Inspection` -> `Dispatched with Carrier` -> `Out for Delivery` -> `Delivered`), carrier, and items.
- `PATCH /api/orders/<order_number>/status`: Updates order milestone status.

### 4. Community & Support
- `POST /api/newsletter/subscribe`: Registers subscriber email, returns 20% voucher code.
- `GET /api/newsletter/subscribers`: Lists subscriber emails for admin.
- `GET /api/testimonials`: Returns verified customer reviews.
- `POST /api/testimonials`: Allows customers to publish product reviews.
- `POST /api/contact`: Submits concierge inquiry.
- `GET /api/contact`: Lists concierge messages for admin.

### 5. Admin & Store Intelligence
- `GET /api/admin/dashboard`: Computes aggregate revenue ($), order count, total catalog products, low-stock alerts, and recent orders.

---

## 🚀 Running the Full-Stack Application

### 1. Start with One-Click Launcher (Windows)
Double-click `start_store.bat` in the project folder.

### 2. Or Start Manually in PowerShell
```powershell
cd "C:\Users\saad\.gemini\antigravity\scratch\lumina-store"
pip install -r requirements.txt
python server.py
```
*The server will initialize `lumina.db`, auto-seed all tables if empty, and serve both the REST API and the storefront at `http://127.0.0.1:5000`.*

### 3. Access the Application
Open your browser and navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**
