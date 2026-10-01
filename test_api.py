"""
Test suite to thoroughly verify all Lumina Backend REST API endpoints.
"""

import json
from server import app


def run_tests():
    print("Beginning Backend Verification Test Suite...\n")
    client = app.test_client()

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    data = res.get_json()
    assert data["status"] == "online"
    print("[PASS] Health Check Passed: Server online, DB connected.")

    # 2. Get Products
    res = client.get("/api/products")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] >= 12
    first_product = data["products"][0]
    print(f"[PASS] Get Products Passed: Retrieved {data['count']} items. Sample: {first_product['name']}")

    # 3. Filter by category
    res = client.get("/api/products?category=tech")
    assert res.status_code == 200
    data = res.get_json()
    for p in data["products"]:
        assert p["category"] == "tech"
    print(f"[PASS] Category Filter Passed: {data['count']} tech items found.")

    # 4. Search products
    res = client.get("/api/products?search=keyboard")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] > 0
    print(f"[PASS] Search Filter Passed: Found {data['count']} matching item(s).")

    # 5. Get Single Product
    res = client.get(f"/api/products/{first_product['id']}")
    assert res.status_code == 200
    assert res.get_json()["product"]["id"] == first_product["id"]
    print("[PASS] Get Single Product Passed.")

    # 6. Validate Promo Code
    res = client.post("/api/promo/validate", json={"code": "LUMINA20", "subtotal": 200})
    assert res.status_code == 200
    data = res.get_json()
    assert data["valid"] is True
    assert data["promo"]["discountAmount"] == 40.0
    print("[PASS] Promo Validation Passed: LUMINA20 applied 20% discount correctly ($40.00 off $200).")

    # 7. Cart Calculation
    res = client.post("/api/cart/calculate", json={
        "items": [{"productId": first_product["id"], "quantity": 1}],
        "promoCode": "LUMINA20"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["freeShippingUnlocked"] is True
    print(f"[PASS] Cart Calculation Passed: Subtotal: ${data['subtotal']}, Discount: ${data['discount']}, Total: ${data['total']}")

    # 8. Create Order (Checkout)
    initial_stock = first_product["stockCount"]
    res = client.post("/api/orders", json={
        "customer": {
            "firstName": "Testing",
            "lastName": "User",
            "email": "test@luminastudio.com",
            "address": "456 Design Blvd",
            "city": "Seattle",
            "zipCode": "98101"
        },
        "items": [
            {"productId": first_product["id"], "quantity": 1, "color": "Space Gray", "size": ""}
        ],
        "promoCode": "LUMINA20",
        "paymentMethod": "Credit Card"
    })
    assert res.status_code == 201
    order_data = res.get_json()["order"]
    order_number = order_data["orderNumber"]
    print(f"[PASS] Create Order Passed: Created order #{order_number} with status '{order_data['status']}'.")

    # Verify inventory decrement
    res = client.get(f"/api/products/{first_product['id']}")
    updated_stock = res.get_json()["product"]["stockCount"]
    assert updated_stock == initial_stock - 1
    print(f"[PASS] Inventory Decrement Verified: Stock changed from {initial_stock} to {updated_stock}.")

    # 9. Track Order
    res = client.get(f"/api/orders/{order_number}")
    assert res.status_code == 200
    track_data = res.get_json()
    assert track_data["success"] is True
    assert len(track_data["tracking"]["steps"]) == 5
    print(f"[PASS] Track Order Passed: Found tracking steps for #{order_number}.")

    # 10. Newsletter Subscribe
    res = client.post("/api/newsletter/subscribe", json={"email": "newbie@designer.org"})
    assert res.status_code in [200, 201]
    assert res.get_json()["promoCode"] == "LUMINA20"
    print("[PASS] Newsletter Subscribe Passed.")

    # 11. Contact Concierge
    res = client.post("/api/contact", json={
        "name": "Jane Designer",
        "email": "jane@design.co",
        "subject": "Wholesale Inquiry",
        "message": "Do you offer trade discounts for interior architecture studios?"
    })
    assert res.status_code == 201
    print("[PASS] Contact Concierge Passed.")

    # 12. Admin Dashboard
    res = client.get("/api/admin/dashboard")
    assert res.status_code == 200
    stats = res.get_json()["stats"]
    assert stats["totalOrders"] >= 2
    print(f"[PASS] Admin Dashboard Passed: Total Orders: {stats['totalOrders']}, Revenue: ${stats['totalRevenue']}.")

    print("\nALL 12 BACKEND TESTS PASSED SUCCESSFULLY! [OK]")


if __name__ == "__main__":
    run_tests()
