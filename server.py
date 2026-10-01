"""
LUMINA STUDIO - Full E-Commerce Backend Server
RESTful API + Static File Server with SQLite Database Integration.
Enhanced with Customer/Owner Auth, Real-time Tracking, Transactions & Pakistan Warehouse Map.
"""

import os
import random
import re
import hashlib
import secrets
import uuid
from functools import wraps
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from database import get_db_connection, init_db, format_product_row

# Configuration & Application Setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Ensure database is created on launch
init_db()

# ==============================================================================
# AUTH HELPERS
# ==============================================================================
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_hex(32)

def get_token_from_request():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return request.headers.get("X-Auth-Token") or request.args.get("token")

def get_current_user():
    """Return user dict if valid token present, else None."""
    token = get_token_from_request()
    if not token:
        return None
    conn = get_db_connection()
    row = conn.execute("""
        SELECT u.*, t.expires_at FROM users u
        JOIN auth_tokens t ON t.user_id = u.id
        WHERE t.token = ? AND t.expires_at > datetime('now')
    """, (token,)).fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required. Please log in."}), 401
        g.user = user
        return f(*args, **kwargs)
    return decorated

def owner_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required. Please log in as Owner."}), 401
        if user.get("role") != "owner":
            return jsonify({"error": "Access denied. Store Operations are restricted to Owner accounts only."}), 403
        g.user = user
        return f(*args, **kwargs)
    return decorated


# ==============================================================================
# STATIC FILE SERVING & HOMEPAGE
# ==============================================================================
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/css/<path:filename>")
def serve_css(filename):
    css_dir = os.path.join(BASE_DIR, "css")
    if os.path.exists(os.path.join(css_dir, filename)):
        return send_from_directory(css_dir, filename)
    return send_from_directory(BASE_DIR, filename)


@app.route("/js/<path:filename>")
def serve_js(filename):
    js_dir = os.path.join(BASE_DIR, "js")
    if os.path.exists(os.path.join(js_dir, filename)):
        return send_from_directory(js_dir, filename)
    return send_from_directory(BASE_DIR, filename)


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    assets_dir = os.path.join(BASE_DIR, "assets")
    if os.path.exists(os.path.join(assets_dir, filename)):
        return send_from_directory(assets_dir, filename)
    return send_from_directory(BASE_DIR, filename)


@app.route("/<path:filename>")
def serve_root_fallback(filename):
    if filename.startswith("api/"):
        return jsonify({"error": "Endpoint not found"}), 404
    if os.path.exists(os.path.join(BASE_DIR, filename)):
        return send_from_directory(BASE_DIR, filename)
    return jsonify({"error": "File not found"}), 404


# ==============================================================================
# SYSTEM & HEALTH APIS
# ==============================================================================
@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        conn = get_db_connection()
        prod_count = conn.execute("SELECT COUNT(*) as c FROM products").fetchone()["c"]
        order_count = conn.execute("SELECT COUNT(*) as c FROM orders").fetchone()["c"]
        conn.close()
        return jsonify({
            "status": "online",
            "server": "Lumina Backend API v1.0",
            "database": "SQLite (lumina.db)",
            "product_count": prod_count,
            "order_count": order_count,
            "timestamp": datetime.now().isoformat() + "Z"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==============================================================================
# AUTHENTICATION API (Customer + Owner Login)
# ==============================================================================
@app.route("/api/auth/register", methods=["POST"])
def register_customer():
    """Register a new customer account."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    city = (data.get("city") or "").strip()

    if not email or not password or not name:
        return jsonify({"error": "Name, email and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email format."}), 400

    conn = get_db_connection()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "An account with this email already exists."}), 409

    pwd_hash = hash_password(password)
    cursor = conn.execute("""
        INSERT INTO users (email, password_hash, name, role, phone, city)
        VALUES (?, ?, ?, 'customer', ?, ?)
    """, (email, pwd_hash, name, phone, city))
    user_id = cursor.lastrowid

    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
                 (user_id, token, expires))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Account created successfully.",
        "token": token,
        "user": {"id": user_id, "email": email, "name": name, "role": "customer", "city": city}
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Login for both customer and owner. Returns token + role."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role_hint = (data.get("role") or "").strip().lower()  # optional: 'owner' or 'customer'

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not user or user["password_hash"] != hash_password(password):
        conn.close()
        return jsonify({"error": "Invalid email or password."}), 401

    if role_hint and user["role"] != role_hint:
        conn.close()
        return jsonify({"error": f"This account is not a {role_hint} account."}), 403

    # Update last_login and issue token
    token = generate_token()
    expires = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("UPDATE users SET last_login = datetime('now') WHERE id = ?", (user["id"],))
    conn.execute("INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
                 (user["id"], token, expires))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user['name']}!",
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "phone": user["phone"],
            "city": user["city"]
        }
    })


@app.route("/api/auth/me", methods=["GET"])
@login_required
def auth_me():
    """Return current authenticated user profile."""
    u = g.user
    return jsonify({
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "phone": u.get("phone"),
        "city": u.get("city"),
        "last_login": u.get("last_login")
    })


@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    token = get_token_from_request()
    conn = get_db_connection()
    conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Logged out successfully."})


# ==============================================================================
# WAREHOUSES / PAKISTAN STORE MAP API
# ==============================================================================
@app.route("/api/warehouses", methods=["GET"])
def list_warehouses():
    """Public list of all active warehouses with coordinates for map."""
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT id, name, city, address, lat, lng, phone, capacity, current_stock,
               manager, type, is_active
        FROM warehouses WHERE is_active = 1 ORDER BY city
    """).fetchall()
    conn.close()
    return jsonify({
        "warehouses": [dict(r) for r in rows],
        "count": len(rows),
        "country": "Pakistan"
    })


@app.route("/api/warehouses/<int:wid>", methods=["GET"])
def get_warehouse(wid):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM warehouses WHERE id = ?", (wid,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Warehouse not found"}), 404
    return jsonify(dict(row))


# ==============================================================================
# PRODUCTS API (FULL CRUD & SEARCH/FILTER)
# ==============================================================================
@app.route("/api/products", methods=["GET"])
def get_products():
    """Returns products with filtering, search, stock check, and sorting."""
    category = request.args.get("category", "all")
    search = request.args.get("search", "").strip().lower()
    in_stock_only = request.args.get("in_stock", "").lower() in ["true", "1"]
    sort_by = request.args.get("sort", "featured")

    query = "SELECT * FROM products WHERE 1=1"
    params = []

    if category and category != "all":
        query += " AND category = ?"
        params.append(category)

    if in_stock_only:
        query += " AND in_stock = 1 AND stock_count > 0"

    if search:
        query += " AND (LOWER(name) LIKE ? OR LOWER(tagline) LIKE ? OR LOWER(category_label) LIKE ? OR LOWER(description) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    if sort_by == "price-asc":
        query += " ORDER BY price ASC"
    elif sort_by == "price-desc":
        query += " ORDER BY price DESC"
    elif sort_by == "rating":
        query += " ORDER BY rating DESC"
    else:  # featured
        query += " ORDER BY is_featured DESC, id ASC"

    conn = get_db_connection()
    rows = conn.execute(query, params).fetchall()
    conn.close()

    products = [format_product_row(row) for row in rows]
    return jsonify({
        "success": True,
        "count": len(products),
        "products": products
    })


@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product_by_id(product_id):
    """Fetches a single product by ID."""
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "error": f"Product with ID {product_id} not found"}), 404

    return jsonify({"success": True, "product": format_product_row(row)})


@app.route("/api/products", methods=["POST"])
@owner_required
def create_product():
    """Adds a new product to the catalog. Owner only."""
    data = request.get_json() or {}
    required_fields = ["name", "category", "price", "image"]
    for f in required_fields:
        if f not in data:
            return jsonify({"success": False, "error": f"Missing required field: {f}"}), 400

    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO products (
            name, tagline, category, category_label, price, original_price,
            rating, reviews_count, badge, badge_type, image, gallery,
            colors, sizes, description, features, in_stock, stock_count, is_featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["name"],
        data.get("tagline", ""),
        data["category"],
        data.get("categoryLabel", data.get("category_label", data["category"].capitalize())),
        float(data["price"]),
        float(data["originalPrice"]) if data.get("originalPrice") else None,
        float(data.get("rating", 5.0)),
        int(data.get("reviewsCount", 0)),
        data.get("badge", ""),
        data.get("badgeType", "accent"),
        data["image"],
        json.dumps(data.get("gallery", [data["image"]])),
        json.dumps(data.get("colors", [])),
        json.dumps(data.get("sizes", [])),
        data.get("description", ""),
        json.dumps(data.get("features", [])),
        1 if data.get("inStock", True) else 0,
        int(data.get("stockCount", 10)),
        1 if data.get("isFeatured", False) else 0
    ))
    new_id = cursor.lastrowid
    conn.commit()
    new_row = conn.execute("SELECT * FROM products WHERE id = ?", (new_id,)).fetchone()
    conn.close()

    return jsonify({"success": True, "message": "Product created", "product": format_product_row(new_row)}), 201


@app.route("/api/products/<int:product_id>", methods=["PUT"])
@owner_required
def update_product(product_id):
    """Updates product attributes, price, or stock levels."""
    data = request.get_json() or {}
    conn = get_db_connection()
    existing = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"success": False, "error": "Product not found"}), 404

    price = float(data["price"]) if "price" in data else existing["price"]
    orig_price = float(data["originalPrice"]) if "originalPrice" in data else existing["original_price"]
    stock_count = int(data["stockCount"]) if "stockCount" in data else existing["stock_count"]
    in_stock = int(data["inStock"]) if "inStock" in data else (1 if stock_count > 0 else 0)

    conn.execute("""
        UPDATE products SET
            name = COALESCE(?, name),
            tagline = COALESCE(?, tagline),
            price = ?,
            original_price = ?,
            stock_count = ?,
            in_stock = ?,
            is_featured = COALESCE(?, is_featured)
        WHERE id = ?
    """, (
        data.get("name"),
        data.get("tagline"),
        price,
        orig_price,
        stock_count,
        in_stock,
        data.get("isFeatured"),
        product_id
    ))
    conn.commit()
    updated = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    conn.close()

    return jsonify({"success": True, "message": "Product updated", "product": format_product_row(updated)})


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
@owner_required
def delete_product(product_id):
    """Deletes a product by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()

    if not deleted:
        return jsonify({"success": False, "error": "Product not found"}), 404
    return jsonify({"success": True, "message": f"Product {product_id} deleted"})


# ==============================================================================
# CATEGORIES API
# ==============================================================================
@app.route("/api/categories", methods=["GET"])
def get_categories():
    """Returns categories with active product counts."""
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT category, category_label, COUNT(*) as count
        FROM products
        GROUP BY category, category_label
    """).fetchall()
    total_count = conn.execute("SELECT COUNT(*) as total FROM products").fetchone()["total"]
    conn.close()

    categories = [{"slug": "all", "label": "All Items", "count": total_count}]
    for r in rows:
        categories.append({
            "slug": r["category"],
            "label": r["category_label"],
            "count": r["count"]
        })
    return jsonify({"success": True, "categories": categories})


# ==============================================================================
# PROMOTIONAL VOUCHERS API
# ==============================================================================
@app.route("/api/promo/validate", methods=["POST"])
def validate_promo():
    """Validates promo code against database and calculates discount."""
    data = request.get_json() or {}
    code = data.get("code", "").strip().upper()
    subtotal = float(data.get("subtotal", 0))

    if not code:
        return jsonify({"success": False, "valid": False, "message": "Please provide a promo code"}), 400

    conn = get_db_connection()
    row = conn.execute("SELECT * FROM promo_codes WHERE UPPER(code) = ? AND is_active = 1", (code,)).fetchone()
    conn.close()

    if not row:
        return jsonify({
            "success": True,
            "valid": False,
            "message": f"Promo code '{code}' is invalid or has expired."
        }), 200

    min_order = row["min_order"] or 0
    if subtotal > 0 and subtotal < min_order:
        return jsonify({
            "success": True,
            "valid": False,
            "message": f"Promo code '{code}' requires a minimum order of ${min_order:.2f}."
        }), 200

    discount_amount = 0.0
    if row["discount_percent"] > 0:
        discount_amount = round((subtotal * row["discount_percent"]) / 100.0, 2)
    elif row["discount_fixed"] > 0:
        discount_amount = min(subtotal, float(row["discount_fixed"]))

    return jsonify({
        "success": True,
        "valid": True,
        "promo": {
            "code": row["code"],
            "description": row["description"],
            "discountPercent": row["discount_percent"],
            "discountFixed": row["discount_fixed"],
            "freeShipping": bool(row["free_shipping"]),
            "discountAmount": discount_amount
        }
    })


@app.route("/api/promo", methods=["GET"])
def list_promos():
    """Lists all configured promotional codes."""
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM promo_codes ORDER BY id ASC").fetchall()
    conn.close()
    promos = [dict(r) for r in rows]
    return jsonify({"success": True, "promos": promos})


# ==============================================================================
# CART CALCULATION API
# ==============================================================================
@app.route("/api/cart/calculate", methods=["POST"])
def calculate_cart():
    data = request.get_json() or {}
    items = data.get("items", [])
    promo_code = data.get("promoCode", "").strip().upper()

    if not items:
        return jsonify({
            "success": True,
            "subtotal": 0.0,
            "discount": 0.0,
            "shipping": 0.0,
            "total": 0.0,
            "items": [],
            "freeShippingUnlocked": False,
            "remainingForFreeShipping": 100.0
        })

    conn = get_db_connection()
    validated_items = []
    subtotal = 0.0

    for item in items:
        prod_id = item.get("productId")
        qty = int(item.get("quantity", 1))
        row = conn.execute("SELECT * FROM products WHERE id = ?", (prod_id,)).fetchone()
        if not row:
            continue
        line_total = round(row["price"] * qty, 2)
        subtotal += line_total
        validated_items.append({
            "productId": prod_id,
            "name": row["name"],
            "image": row["image"],
            "price": row["price"],
            "quantity": qty,
            "color": item.get("color", "Standard"),
            "size": item.get("size", ""),
            "lineTotal": line_total,
            "availableStock": row["stock_count"],
            "inStock": bool(row["in_stock"])
        })

    discount_amount = 0.0
    free_shipping = False

    if promo_code:
        p_row = conn.execute("SELECT * FROM promo_codes WHERE UPPER(code) = ? AND is_active = 1", (promo_code,)).fetchone()
        if p_row:
            if not p_row["min_order"] or subtotal >= p_row["min_order"]:
                free_shipping = bool(p_row["free_shipping"])
                if p_row["discount_percent"] > 0:
                    discount_amount = round((subtotal * p_row["discount_percent"]) / 100.0, 2)
                elif p_row["discount_fixed"] > 0:
                    discount_amount = min(subtotal, float(p_row["discount_fixed"]))

    conn.close()

    free_shipping_threshold = 100.0
    shipping_cost = 0.0 if (subtotal >= free_shipping_threshold or free_shipping or subtotal == 0) else 15.0
    total = max(0.0, round(subtotal - discount_amount + shipping_cost, 2))
    remaining = max(0.0, round(free_shipping_threshold - subtotal, 2))

    return jsonify({
        "success": True,
        "subtotal": round(subtotal, 2),
        "discount": discount_amount,
        "shipping": shipping_cost,
        "total": total,
        "freeShippingUnlocked": subtotal >= free_shipping_threshold or free_shipping,
        "remainingForFreeShipping": remaining,
        "items": validated_items
    })


# ==============================================================================
# ORDERS & CHECKOUT API
# ==============================================================================
@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json() or {}
    customer = data.get("customer", {})
    items = data.get("items", [])
    promo_code = (data.get("promoCode") or "").strip().upper()
    payment_method = data.get("paymentMethod", "Credit Card")

    required_cust = ["firstName", "lastName", "email", "address", "city", "zipCode"]
    for field in required_cust:
        if not customer.get(field, "").strip():
            return jsonify({"success": False, "error": f"Please provide {field}"}), 400

    if not items:
        return jsonify({"success": False, "error": "Your bag is empty"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    subtotal = 0.0
    order_items_to_save = []

    for item in items:
        prod_id = item.get("productId")
        qty = int(item.get("quantity", 1))
        p_row = cursor.execute("SELECT * FROM products WHERE id = ?", (prod_id,)).fetchone()

        if not p_row:
            conn.close()
            return jsonify({"success": False, "error": f"Product #{prod_id} no longer exists"}), 400

        if p_row["stock_count"] < qty:
            conn.close()
            return jsonify({
                "success": False,
                "error": f"Insufficient stock for '{p_row['name']}'. Only {p_row['stock_count']} remaining."
            }), 400

        line_total = round(p_row["price"] * qty, 2)
        subtotal += line_total
        order_items_to_save.append({
            "product_id": prod_id,
            "product_name": p_row["name"],
            "product_image": p_row["image"],
            "price": p_row["price"],
            "quantity": qty,
            "color": item.get("color", "Standard"),
            "size": item.get("size", ""),
            "total": line_total
        })

    discount_amount = 0.0
    free_shipping = False
    if promo_code:
        p_row = cursor.execute("SELECT * FROM promo_codes WHERE UPPER(code) = ? AND is_active = 1", (promo_code,)).fetchone()
        if p_row:
            if not p_row["min_order"] or subtotal >= p_row["min_order"]:
                free_shipping = bool(p_row["free_shipping"])
                if p_row["discount_percent"] > 0:
                    discount_amount = round((subtotal * p_row["discount_percent"]) / 100.0, 2)
                elif p_row["discount_fixed"] > 0:
                    discount_amount = min(subtotal, float(p_row["discount_fixed"]))

    shipping_cost = 0.0 if (subtotal >= 100.0 or free_shipping) else 15.0
    total = max(0.0, round(subtotal - discount_amount + shipping_cost, 2))

    order_num = f"LUM-{random.randint(100000, 999999)}"
    delivery_date = (datetime.now() + timedelta(days=4)).strftime("%B %d, %Y")
    full_name = f"{customer['firstName']} {customer['lastName']}".strip()

    # Decrement stock
    for item in order_items_to_save:
        cursor.execute("""
            UPDATE products
            SET stock_count = stock_count - ?,
                in_stock = CASE WHEN stock_count - ? <= 0 THEN 0 ELSE 1 END
            WHERE id = ?
        """, (item["quantity"], item["quantity"], item["product_id"]))

    cursor.execute("""
        INSERT INTO orders (
            order_number, customer_name, customer_email, street_address, city, zip_code,
            subtotal, discount, shipping, total, promo_code, payment_method, status,
            tracking_carrier, estimated_delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order_num,
        full_name,
        customer["email"],
        customer["address"],
        customer["city"],
        customer["zipCode"],
        subtotal,
        discount_amount,
        shipping_cost,
        total,
        promo_code if discount_amount > 0 or free_shipping else None,
        payment_method,
        "Confirmed",
        "Lumina Express Priority (Carbon Neutral)",
        delivery_date
    ))
    order_id = cursor.lastrowid

    for item in order_items_to_save:
        cursor.execute("""
            INSERT INTO order_items (
                order_id, product_id, product_name, product_image, price, quantity, color, size, total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id,
            item["product_id"],
            item["product_name"],
            item["product_image"],
            item["price"],
            item["quantity"],
            item["color"],
            item["size"],
            item["total"]
        ))

    # Real-time status history entry
    cursor.execute("""
        INSERT INTO order_status_history (order_id, status, note, location)
        VALUES (?, ?, ?, ?)
    """, (order_id, "Confirmed", "Order received and payment authorized", customer.get("city", "Pakistan")))

    # Create transaction record (real-time payment simulation)
    txn_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    payment_status = "completed"
    if payment_method in ["Cash on Delivery", "COD"]:
        payment_status = "pending"
    cursor.execute("""
        INSERT INTO transactions (order_id, transaction_id, payment_method, amount, currency, status, completed_at)
        VALUES (?, ?, ?, ?, 'PKR', ?, CASE WHEN ? = 'completed' THEN datetime('now') ELSE NULL END)
    """, (order_id, txn_id, payment_method, total, payment_status, payment_status))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Order placed successfully",
        "order": {
            "orderNumber": order_num,
            "status": "Confirmed",
            "customerName": full_name,
            "customerEmail": customer["email"],
            "subtotal": subtotal,
            "discount": discount_amount,
            "shipping": shipping_cost,
            "total": total,
            "estimatedDelivery": delivery_date,
            "carrier": "Lumina Express Priority (Carbon Neutral)",
            "itemCount": sum(i["quantity"] for i in order_items_to_save),
            "paymentMethod": payment_method,
            "transactionId": txn_id,
            "paymentStatus": payment_status
        }
    }), 201


@app.route("/api/orders", methods=["GET"])
@owner_required
def get_orders():
    """Owner-only: list all orders."""
    limit = int(request.args.get("limit", 50))
    conn = get_db_connection()
    orders_rows = conn.execute("SELECT * FROM orders ORDER BY id DESC LIMIT ?", (limit,)).fetchall()

    orders = []
    for o in orders_rows:
        order_dict = dict(o)
        items_rows = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (o["id"],)).fetchall()
        order_dict["items"] = [dict(it) for it in items_rows]
        orders.append(order_dict)

    conn.close()
    return jsonify({"success": True, "count": len(orders), "orders": orders})


@app.route("/api/orders/<order_query>", methods=["GET"])
def track_order(order_query):
    clean_query = order_query.strip()
    conn = get_db_connection()

    order_row = conn.execute("""
        SELECT * FROM orders
        WHERE UPPER(order_number) = UPPER(?) OR LOWER(customer_email) = LOWER(?)
        ORDER BY id DESC LIMIT 1
    """, (clean_query, clean_query)).fetchone()

    if not order_row:
        conn.close()
        return jsonify({
            "success": False,
            "error": f"No shipment found matching '{clean_query}'. Please verify your order number (e.g., LUM-742918)."
        }), 404

    items_rows = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (order_row["id"],)).fetchall()
    history_rows = conn.execute("""
        SELECT status, note, location, created_at FROM order_status_history
        WHERE order_id = ? ORDER BY created_at ASC
    """, (order_row["id"],)).fetchall()
    txn = conn.execute("SELECT * FROM transactions WHERE order_id = ? ORDER BY id DESC LIMIT 1",
                       (order_row["id"],)).fetchone()
    conn.close()

    order_dict = dict(order_row)
    order_dict["items"] = [dict(it) for it in items_rows]
    history = [dict(h) for h in history_rows]

    status = order_row["status"] or "Confirmed"
    steps = [
        {"title": "Order Confirmed", "desc": "Payment secured & receipt generated", "done": True, "current": status == "Confirmed"},
        {"title": "Artisan Inspection", "desc": "Handcrafted quality control & packaging", "done": status in ["Artisan Inspection", "Processing", "Dispatched with Carrier", "In Transit", "Out for Delivery", "Delivered"], "current": status in ["Artisan Inspection", "Processing"]},
        {"title": "Dispatched with Carrier", "desc": f"Carbon-neutral tracked courier ({order_row['tracking_carrier']})", "done": status in ["Dispatched with Carrier", "In Transit", "Out for Delivery", "Delivered"], "current": status in ["Dispatched with Carrier", "In Transit"]},
        {"title": "Out for Delivery", "desc": "With local courier in destination city", "done": status in ["Out for Delivery", "Delivered"], "current": status == "Out for Delivery"},
        {"title": "Delivered", "desc": f"Delivered to {order_row['city']}, {order_row['zip_code']}", "done": status == "Delivered", "current": status == "Delivered"}
    ]

    return jsonify({
        "success": True,
        "order": order_dict,
        "tracking": {
            "currentStatus": status,
            "carrier": order_row["tracking_carrier"],
            "estimatedDelivery": order_row["estimated_delivery"] or "3-5 Business Days",
            "destination": f"{order_row['street_address']}, {order_row['city']} {order_row['zip_code']}",
            "steps": steps,
            "history": history,
            "lastUpdated": history[-1]["created_at"] if history else order_row["created_at"]
        },
        "transaction": dict(txn) if txn else None
    })


@app.route("/api/orders/<order_number>/status", methods=["PATCH"])
@owner_required
def update_order_status(order_number):
    """Owner-only: update order status and append real-time history entry."""
    data = request.get_json() or {}
    new_status = data.get("status")
    note = data.get("note") or ""
    location = data.get("location") or ""
    allowed = ["Confirmed", "Artisan Inspection", "Processing", "Dispatched with Carrier",
               "In Transit", "Out for Delivery", "Delivered", "Cancelled"]

    if new_status not in allowed:
        return jsonify({"success": False, "error": f"Invalid status. Choose from: {', '.join(allowed)}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    order = cursor.execute("SELECT id FROM orders WHERE UPPER(order_number) = UPPER(?)", (order_number,)).fetchone()
    if not order:
        conn.close()
        return jsonify({"success": False, "error": f"Order {order_number} not found"}), 404

    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (new_status, order["id"]))
    cursor.execute("""
        INSERT INTO order_status_history (order_id, status, note, location)
        VALUES (?, ?, ?, ?)
    """, (order["id"], new_status, note or f"Status changed to {new_status}", location))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Order {order_number} status updated to {new_status}",
        "status": new_status,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })


# ==============================================================================
# NEWSLETTER SUBSCRIPTION API
# ==============================================================================
@app.route("/api/newsletter/subscribe", methods=["POST"])
def subscribe_newsletter():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email or not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        return jsonify({"success": False, "error": "Please provide a valid email address"}), 400

    conn = get_db_connection()
    existing = conn.execute("SELECT * FROM newsletter_subscribers WHERE email = ?", (email,)).fetchone()

    if existing:
        conn.close()
        return jsonify({
            "success": True,
            "alreadySubscribed": True,
            "promoCode": "LUMINA20",
            "message": "Welcome back! Your 20% voucher code 'LUMINA20' is active."
        })

    cursor = conn.cursor()
    cursor.execute("INSERT INTO newsletter_subscribers (email, discount_code) VALUES (?, 'LUMINA20')", (email,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "alreadySubscribed": False,
        "promoCode": "LUMINA20",
        "message": "Welcome to the Lumina Collective! Use code LUMINA20 for 20% off your first purchase."
    }), 201


@app.route("/api/newsletter/subscribers", methods=["GET"])
@owner_required
def list_subscribers():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM newsletter_subscribers ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"success": True, "count": len(rows), "subscribers": [dict(r) for r in rows]})


# ==============================================================================
# TESTIMONIALS & REVIEWS API
# ==============================================================================
@app.route("/api/testimonials", methods=["GET"])
def get_testimonials():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM testimonials ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"success": True, "testimonials": [dict(r) for r in rows]})


@app.route("/api/testimonials", methods=["POST"])
def submit_testimonial():
    data = request.get_json() or {}
    for f in ["author", "text", "product"]:
        if not data.get(f):
            return jsonify({"success": False, "error": f"Missing {f}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO testimonials (author, role, avatar, rating, date_str, text, product)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data["author"],
        data.get("role", "Verified Lumina Customer"),
        data.get("avatar", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80"),
        int(data.get("rating", 5)),
        "Just now",
        data["text"],
        data["product"]
    ))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Review submitted successfully!"}), 201


# ==============================================================================
# CONCIERGE / CONTACT API
# ==============================================================================
@app.route("/api/contact", methods=["POST"])
def submit_contact_inquiry():
    data = request.get_json() or {}
    for f in ["name", "email", "message"]:
        if not data.get(f, "").strip():
            return jsonify({"success": False, "error": f"Please enter your {f}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO contact_messages (name, email, subject, message)
        VALUES (?, ?, ?, ?)
    """, (
        data["name"].strip(),
        data["email"].strip(),
        data.get("subject", "General Inquiries & Product Advice").strip(),
        data["message"].strip()
    ))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Thank you for reaching out. Our Studio Concierge will respond to your email within 24 hours."
    }), 201


@app.route("/api/contact", methods=["GET"])
@owner_required
def list_contact_inquiries():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM contact_messages ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify({"success": True, "messages": [dict(r) for r in rows]})


# ==============================================================================
# ADMIN METRICS & DASHBOARD API (Owner only)
# ==============================================================================
@app.route("/api/admin/dashboard", methods=["GET"])
@owner_required
def admin_dashboard():
    conn = get_db_connection()
    total_revenue = conn.execute("SELECT COALESCE(SUM(total), 0) as rev FROM orders").fetchone()["rev"]
    total_orders = conn.execute("SELECT COUNT(*) as c FROM orders").fetchone()["c"]
    total_products = conn.execute("SELECT COUNT(*) as c FROM products").fetchone()["c"]
    low_stock = conn.execute("SELECT COUNT(*) as c FROM products WHERE stock_count < 10").fetchone()["c"]
    total_subscribers = conn.execute("SELECT COUNT(*) as c FROM newsletter_subscribers").fetchone()["c"]
    inquiries_count = conn.execute("SELECT COUNT(*) as c FROM contact_messages").fetchone()["c"]

    recent_orders = conn.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 5").fetchall()
    low_stock_items = conn.execute("SELECT id, name, stock_count, price FROM products WHERE stock_count < 10 ORDER BY stock_count ASC").fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "stats": {
            "totalRevenue": round(total_revenue, 2),
            "totalOrders": total_orders,
            "totalProducts": total_products,
            "lowStockAlerts": low_stock,
            "totalSubscribers": total_subscribers,
            "contactInquiries": inquiries_count
        },
        "recentOrders": [dict(o) for o in recent_orders],
        "lowStockProducts": [dict(p) for p in low_stock_items]
    })


# ==============================================================================
# CUSTOMER ORDER HISTORY & TRANSACTIONS
# ==============================================================================
@app.route("/api/my/orders", methods=["GET"])
@login_required
def my_orders():
    """Logged-in customer: their own order history."""
    email = g.user["email"]
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT * FROM orders WHERE LOWER(customer_email) = LOWER(?) ORDER BY id DESC LIMIT 50
    """, (email,)).fetchall()
    orders = []
    for o in rows:
        d = dict(o)
        items = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (o["id"],)).fetchall()
        d["items"] = [dict(i) for i in items]
        orders.append(d)
    conn.close()
    return jsonify({"success": True, "count": len(orders), "orders": orders})


@app.route("/api/transactions", methods=["GET"])
@owner_required
def list_transactions():
    """Owner: list all payment transactions with real-time status."""
    limit = int(request.args.get("limit", 50))
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT t.*, o.order_number, o.customer_name, o.customer_email
        FROM transactions t
        LEFT JOIN orders o ON o.id = t.order_id
        ORDER BY t.id DESC LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return jsonify({"success": True, "count": len(rows), "transactions": [dict(r) for r in rows]})


@app.route("/api/admin/advance-order/<order_number>", methods=["POST"])
@owner_required
def advance_order_status(order_number):
    """Owner helper: advance order to next logical status with timestamp."""
    sequence = ["Confirmed", "Artisan Inspection", "Processing", "Dispatched with Carrier",
                "In Transit", "Out for Delivery", "Delivered"]
    conn = get_db_connection()
    order = conn.execute("SELECT id, status FROM orders WHERE UPPER(order_number) = UPPER(?)",
                         (order_number,)).fetchone()
    if not order:
        conn.close()
        return jsonify({"error": "Order not found"}), 404
    current = order["status"] or "Confirmed"
    try:
        idx = sequence.index(current)
        next_status = sequence[min(idx + 1, len(sequence) - 1)]
    except ValueError:
        next_status = "Processing"
    conn.execute("UPDATE orders SET status = ? WHERE id = ?", (next_status, order["id"]))
    conn.execute("""
        INSERT INTO order_status_history (order_id, status, note, location)
        VALUES (?, ?, ?, ?)
    """, (order["id"], next_status, f"Advanced to {next_status} by owner", "Pakistan Hub"))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "previous": current, "status": next_status})


# ==============================================================================
# SERVER ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f">> LUMINA Studio Server starting on http://127.0.0.1:{port}")
    print("   Default Owner: owner@lumina.pk / Owner@123")
    print("   Demo Customer: customer@example.com / Customer1")
    app.run(host="127.0.0.1", port=port, debug=False)
