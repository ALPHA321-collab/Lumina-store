/**
 * LUMINA STUDIO - Core E-Commerce Application & Backend Connector
 * Full integration with Flask REST API & SQLite Database
 */

// Determine API Base URL automatically
const API_BASE = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5000'))
  ? 'http://127.0.0.1:5000/api'
  : '/api';

// Application State
const state = {
  products: typeof PRODUCTS !== 'undefined' ? PRODUCTS : [],
  filteredProducts: typeof PRODUCTS !== 'undefined' ? PRODUCTS : [],
  activeCategory: "all",
  searchQuery: "",
  sortBy: "featured",
  onlyInStock: false,
  cart: JSON.parse(localStorage.getItem("lumina_cart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("lumina_wishlist") || "[]"),
  appliedPromo: null,
  activeQuickViewProduct: null,
  theme: localStorage.getItem("lumina_theme") || "light",
  backendConnected: false,
  checkoutCustomer: null,
  selectedPaymentMethod: "Credit Card",
  adminStats: null,
  adminOrders: [],
  adminTab: "adminTabOverview",
  // Auth
  authToken: localStorage.getItem("lumina_token") || null,
  currentUser: JSON.parse(localStorage.getItem("lumina_user") || "null"),
  warehouses: [],
  mapInstance: null
};

// Helper: authenticated fetch
async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  if (state.authToken) {
    headers["Authorization"] = `Bearer ${state.authToken}`;
  }
  headers["Content-Type"] = headers["Content-Type"] || "application/json";
  return fetch(url, { ...options, headers });
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderProducts();
  if (typeof TESTIMONIALS !== 'undefined') {
    renderTestimonials(TESTIMONIALS);
  }
  updateCartUI();
  updateWishlistUI();
  bindEvents();
  populateReviewProductDropdown();
  updateAuthUI();

  // Connect to Backend Server
  checkBackendHealth();
  loadProductsFromBackend();
  loadTestimonialsFromBackend();
  loadWarehouses();
});

/* ==========================================================================
   BACKEND HEALTH & STATUS
   ========================================================================== */
async function checkBackendHealth() {
  const indicator = document.getElementById("backendStatusIndicator");
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      state.backendConnected = true;
      if (indicator) {
        indicator.className = "status-pill";
        indicator.innerHTML = `<span class="status-dot"></span> Backend Live (${data.database})`;
        indicator.title = `API Connected • ${data.product_count} products • ${data.order_count} orders in DB`;
      }
    } else {
      setBackendOffline();
    }
  } catch (err) {
    setBackendOffline();
  }
}

function setBackendOffline() {
  state.backendConnected = false;
  const indicator = document.getElementById("backendStatusIndicator");
  if (indicator) {
    indicator.className = "status-pill offline";
    indicator.innerHTML = `<span class="status-dot"></span> Standalone Mode`;
    indicator.title = "Backend server at http://127.0.0.1:5000 not detected. Using client-side state.";
  }
}

/* ==========================================================================
   THEME TOGGLER
   ========================================================================== */
function initTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    updateThemeIcon(themeBtn, state.theme);
  }
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", state.theme);
  localStorage.setItem("lumina_theme", state.theme);
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    updateThemeIcon(themeBtn, state.theme);
  }
  showToast(`Switched to ${state.theme} theme`, "info");
}

function updateThemeIcon(btn, theme) {
  if (theme === "dark") {
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
    btn.title = "Switch to Light Mode";
  } else {
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
    btn.title = "Switch to Dark Mode";
  }
}

/* ==========================================================================
   PRODUCTS API & RENDERING
   ========================================================================== */
async function loadProductsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (res.ok) {
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        state.products = data.products;
        filterAndSortProducts();
        populateReviewProductDropdown();
      }
    }
  } catch (err) {
    console.log("Operating on static catalog fallback:", err);
  }
}

function filterAndSortProducts() {
  let list = [...state.products];

  // Category Filter
  if (state.activeCategory !== "all") {
    list = list.filter(p => p.category === state.activeCategory);
  }

  // Search Query
  if (state.searchQuery.trim() !== "") {
    const q = state.searchQuery.toLowerCase().trim();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.tagline && p.tagline.toLowerCase().includes(q)) ||
      (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // Stock Filter
  if (state.onlyInStock) {
    list = list.filter(p => p.inStock);
  }

  // Sort
  if (state.sortBy === "price-asc") {
    list.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === "price-desc") {
    list.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === "rating") {
    list.sort((a, b) => b.rating - a.rating);
  } else {
    // Featured default
    list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }

  state.filteredProducts = list;
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const countEl = document.getElementById("resultsCount");
  if (!grid) return;

  if (countEl) {
    countEl.innerHTML = `Showing <strong>${state.filteredProducts.length}</strong> items`;
  }

  if (state.filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">No products match your criteria</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Try adjusting your search terms or clearing selected category filters.</p>
        <button class="btn-primary" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.filteredProducts.map(product => {
    const isWishlisted = state.wishlist.includes(product.id);
    const badgeClass = `badge-${product.badgeType || 'accent'}`;
    const outOfStock = product.stockCount <= 0 || !product.inStock;

    return `
      <article class="product-card" data-id="${product.id}">
        <div class="product-image-container" onclick="openQuickView(${product.id})">
          ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>` : ''}
          ${outOfStock ? `<span class="product-badge badge-sale" style="top: 2.5rem;">Sold Out</span>` : ''}
          <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" 
                  onclick="event.stopPropagation(); toggleWishlist(${product.id})" 
                  title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          
          <button class="quick-view-btn" onclick="event.stopPropagation(); openQuickView(${product.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Quick View
          </button>
        </div>

        <div class="product-details">
          <div class="product-category-row">
            <span class="product-category">${product.categoryLabel || product.category}</span>
            <div class="product-rating">
              <svg class="star-icon" width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span>${product.rating}</span>
              <span class="review-count">(${product.reviewsCount})</span>
            </div>
          </div>

          <h3 class="product-title" onclick="openQuickView(${product.id})">${product.name}</h3>
          <p class="product-tagline">${product.tagline || ''}</p>

          <div class="product-swatches">
            ${(product.colors || []).map(c => `
              <span class="swatch-circle" style="background-color: ${c.hex};" title="${c.name}"></span>
            `).join('')}
            ${product.stockCount && product.stockCount < 10 ? `
              <span style="font-size: 0.72rem; color: var(--accent-amber); font-weight: 700; margin-left: auto;">
                Only ${product.stockCount} left
              </span>
            ` : ''}
          </div>

          <div class="product-footer">
            <div class="price-container">
              <span class="current-price">$${product.price}</span>
              ${product.originalPrice ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
            </div>
            <button class="btn-add-cart" id="btn-add-${product.id}" onclick="addToCart(${product.id})" ${outOfStock ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              ${outOfStock ? 'Sold Out' : 'Add to Bag'}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function resetFilters() {
  state.activeCategory = "all";
  state.searchQuery = "";
  state.onlyInStock = false;
  state.sortBy = "featured";

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";

  const inStockCheckbox = document.getElementById("inStockOnly");
  if (inStockCheckbox) inStockCheckbox.checked = false;

  const sortSelect = document.getElementById("sortBySelect");
  if (sortSelect) sortSelect.value = "featured";

  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.category === "all");
  });

  filterAndSortProducts();
}

/* ==========================================================================
   CART SYSTEM
   ========================================================================== */
function addToCart(productId, quantity = 1, selectedColor = null, selectedSize = null) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (product.stockCount && product.stockCount <= 0) {
    showToast(`Sorry, "${product.name}" is currently sold out`, "error");
    return;
  }

  const color = selectedColor || (product.colors && product.colors[0]?.name) || "Standard";
  const size = selectedSize || (product.sizes && product.sizes[0]) || null;

  const existingIndex = state.cart.findIndex(
    item => item.productId === productId && item.color === color && item.size === size
  );

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += quantity;
  } else {
    state.cart.push({
      productId,
      quantity,
      color,
      size
    });
  }

  saveCart();
  updateCartUI();

  const btn = document.getElementById(`btn-add-${productId}`);
  if (btn) {
    const originalText = btn.innerHTML;
    btn.classList.add("added");
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg> Added!
    `;
    setTimeout(() => {
      btn.classList.remove("added");
      btn.innerHTML = originalText;
    }, 1500);
  }

  bumpCartBadge();
  showToast(`Added "${product.name}" to your bag`, "success");
}

function updateCartQuantity(index, delta) {
  if (!state.cart[index]) return;
  state.cart[index].quantity += delta;
  if (state.cart[index].quantity <= 0) {
    state.cart.splice(index, 1);
  }
  saveCart();
  updateCartUI();
}

function removeCartItem(index) {
  const item = state.cart[index];
  if (!item) return;
  const product = state.products.find(p => p.id === item.productId);
  state.cart.splice(index, 1);
  saveCart();
  updateCartUI();
  if (product) {
    showToast(`Removed "${product.name}" from bag`, "info");
  }
}

function saveCart() {
  localStorage.setItem("lumina_cart", JSON.stringify(state.cart));
}

function bumpCartBadge() {
  const badge = document.getElementById("cartCountBadge");
  if (badge) {
    badge.classList.remove("bump");
    void badge.offsetWidth;
    badge.classList.add("bump");
  }
}

function updateCartUI() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("cartCountBadge");
  if (badge) {
    badge.textContent = totalCount;
    badge.style.display = totalCount > 0 ? "flex" : "none";
  }

  const drawerItems = document.getElementById("cartDrawerItems");
  const subtotalEl = document.getElementById("cartSubtotal");
  const discountEl = document.getElementById("cartDiscount");
  const discountRow = document.getElementById("cartDiscountRow");
  const shippingEl = document.getElementById("cartShipping");
  const totalEl = document.getElementById("cartTotal");
  const progressFill = document.getElementById("shippingProgressFill");
  const progressText = document.getElementById("shippingProgressText");
  const checkoutBtn = document.getElementById("cartCheckoutBtn");

  if (!drawerItems) return;

  if (state.cart.length === 0) {
    drawerItems.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-secondary); display: inline-flex; align-items: center; justify-content: center; color: var(--text-muted); margin-bottom: 1rem;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
        <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">Your bag is empty</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Explore our curated collection and treat yourself to everyday luxury.</p>
        <button class="btn-primary" onclick="toggleCartDrawer(false)">Start Shopping</button>
      </div>
    `;
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (subtotalEl) subtotalEl.textContent = "$0.00";
    if (totalEl) totalEl.textContent = "$0.00";
    if (discountRow) discountRow.style.display = "none";
    if (progressFill) progressFill.style.width = "0%";
    if (progressText) progressText.innerHTML = `Add <strong>$100.00</strong> more for Free Shipping`;
    return;
  }

  if (checkoutBtn) checkoutBtn.disabled = false;

  let subtotal = 0;
  drawerItems.innerHTML = state.cart.map((item, index) => {
    const product = state.products.find(p => p.id === item.productId);
    if (!product) return "";
    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;

    return `
      <div class="cart-item">
        <img src="${product.image}" alt="${product.name}" class="cart-item-img">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${product.name}</h4>
          <p class="cart-item-variant">${item.color}${item.size ? ` / ${item.size}` : ''}</p>
          <div class="cart-item-bottom">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="updateCartQuantity(${index}, -1)">−</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartQuantity(${index}, 1)">+</button>
            </div>
            <span class="cart-item-price">$${itemTotal.toFixed(2)}</span>
            <button class="cart-item-remove" onclick="removeCartItem(${index})" title="Remove item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const freeShippingThreshold = 100;
  let shippingCost = subtotal >= freeShippingThreshold ? 0 : 15;
  if (state.appliedPromo && state.appliedPromo.freeShipping) {
    shippingCost = 0;
  }

  const remainingForFreeShip = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  if (progressFill) progressFill.style.width = `${progressPercent}%`;
  if (progressText) {
    if (subtotal >= freeShippingThreshold || (state.appliedPromo && state.appliedPromo.freeShipping)) {
      progressText.innerHTML = `🎉 <strong>Congratulations!</strong> You unlocked Free Express Shipping!`;
    } else {
      progressText.innerHTML = `Add <strong>$${remainingForFreeShip.toFixed(2)}</strong> more for <strong>Free Shipping</strong>`;
    }
  }

  let discountAmount = 0;
  if (state.appliedPromo) {
    if (state.appliedPromo.discountPercent) {
      discountAmount = (subtotal * state.appliedPromo.discountPercent) / 100;
    } else if (state.appliedPromo.discountFixed) {
      discountAmount = Math.min(subtotal, state.appliedPromo.discountFixed);
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount + (subtotal > 0 ? shippingCost : 0));

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (shippingEl) shippingEl.textContent = shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)}`;

  if (discountRow && discountEl) {
    if (discountAmount > 0) {
      discountRow.style.display = "flex";
      discountEl.textContent = `-$${discountAmount.toFixed(2)}`;
    } else {
      discountRow.style.display = "none";
    }
  }

  if (totalEl) totalEl.textContent = `$${finalTotal.toFixed(2)}`;
}

/* ==========================================================================
   PROMOTIONAL CODE ENGINE (BACKEND INTEGRATED)
   ========================================================================== */
async function applyPromoCode() {
  const input = document.getElementById("promoCodeInput");
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  if (!code) {
    showToast("Please enter a voucher code", "error");
    return;
  }

  const subtotal = state.cart.reduce((sum, item) => {
    const p = state.products.find(prod => prod.id === item.productId);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  try {
    const res = await fetch(`${API_BASE}/promo/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal })
    });
    const data = await res.json();

    if (data.valid && data.promo) {
      state.appliedPromo = data.promo;
      updateCartUI();
      showToast(`Code "${code}" applied: ${data.promo.description}!`, "success");
      input.value = "";
    } else {
      showToast(data.message || "Invalid promotional voucher code", "error");
    }
  } catch (err) {
    if (typeof PROMO_CODES !== 'undefined' && PROMO_CODES[code]) {
      state.appliedPromo = { code, ...PROMO_CODES[code] };
      updateCartUI();
      showToast(`Code "${code}" applied: ${state.appliedPromo.description}!`, "success");
      input.value = "";
    } else {
      showToast("Invalid promotional voucher code. Try 'LUMINA20'", "error");
    }
  }
}

function toggleCartDrawer(open) {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  if (drawer && backdrop) {
    const shouldOpen = open !== undefined ? open : !drawer.classList.contains("active");
    drawer.classList.toggle("active", shouldOpen);
    backdrop.classList.toggle("active", shouldOpen);
    document.body.style.overflow = shouldOpen ? "hidden" : "";
  }
}

/* ==========================================================================
   WISHLIST SYSTEM
   ========================================================================== */
function toggleWishlist(productId) {
  const index = state.wishlist.indexOf(productId);
  const product = state.products.find(p => p.id === productId);

  if (index > -1) {
    state.wishlist.splice(index, 1);
    if (product) showToast(`Removed "${product.name}" from wishlist`, "info");
  } else {
    state.wishlist.push(productId);
    if (product) showToast(`Saved "${product.name}" to wishlist`, "success");
  }

  localStorage.setItem("lumina_wishlist", JSON.stringify(state.wishlist));
  updateWishlistUI();
  renderProducts();
}

function updateWishlistUI() {
  const badge = document.getElementById("wishlistCountBadge");
  if (badge) {
    const count = state.wishlist.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  }
}

function openWishlistModal() {
  const modal = document.getElementById("wishlistModal");
  const listEl = document.getElementById("wishlistItemsList");
  if (!modal || !listEl) return;

  if (state.wishlist.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="1.5" style="margin-bottom: 1rem;">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">Your Wishlist is Empty</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Click the heart icon on any product to save items you love for later.</p>
        <button class="btn-primary" onclick="closeModal('wishlistModal')">Explore Products</button>
      </div>
    `;
  } else {
    listEl.innerHTML = state.wishlist.map(id => {
      const product = state.products.find(p => p.id === id);
      if (!product) return "";
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${product.image}" style="width: 60px; height: 60px; border-radius: var(--radius-md); object-fit: cover;">
            <div>
              <h5 style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${product.name}</h5>
              <span style="font-weight: 800; color: var(--brand-primary);">$${product.price}</span>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-add-cart" onclick="addToCart(${product.id}); closeModal('wishlistModal')">Move to Bag</button>
            <button class="icon-btn" onclick="toggleWishlist(${product.id}); openWishlistModal()" title="Remove">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

/* ==========================================================================
   QUICK VIEW MODAL
   ========================================================================== */
function openQuickView(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.activeQuickViewProduct = product;
  const modal = document.getElementById("quickViewModal");
  const container = document.getElementById("quickViewContent");
  if (!modal || !container) return;

  let selectedColor = (product.colors && product.colors[0]?.name) || "Standard";
  let selectedSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : "";
  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];

  container.innerHTML = `
    <div class="quick-view-grid">
      <div class="modal-gallery">
        <div class="modal-gallery-main">
          <img id="quickViewMainImg" src="${gallery[0]}" alt="${product.name}">
        </div>
        <div class="modal-gallery-thumbs">
          ${gallery.map((img, i) => `
            <button class="thumb-btn ${i === 0 ? 'active' : ''}" onclick="switchQuickViewImage(this, '${img}')">
              <img src="${img}" alt="${product.name} thumbnail">
            </button>
          `).join('')}
        </div>
      </div>

      <div class="modal-details">
        <span class="product-category" style="margin-bottom: 0.35rem;">${product.categoryLabel || product.category}</span>
        <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); line-height: 1.25; margin-bottom: 0.5rem;">${product.name}</h2>
        
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div class="product-rating">
            <svg class="star-icon" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span style="font-weight: 700;">${product.rating}</span>
            <span class="review-count">(${product.reviewsCount} verified reviews)</span>
          </div>
          <span style="color: var(--border-subtle);">•</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: ${product.stockCount > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
            ${product.stockCount > 0 ? `In Stock (${product.stockCount} left)` : 'Backordered'}
          </span>
        </div>

        <div class="price-container" style="margin-bottom: 1.25rem;">
          <span class="current-price" style="font-size: 1.6rem;">$${product.price}</span>
          ${product.originalPrice ? `<span class="original-price" style="font-size: 1rem;">$${product.originalPrice}</span>` : ''}
          ${product.originalPrice ? `<span class="product-badge badge-sale" style="position: static; margin-left: 0.5rem;">Save $${(product.originalPrice - product.price).toFixed(2)}</span>` : ''}
        </div>

        <p style="font-size: 0.9rem; color: var(--text-body); line-height: 1.6; margin-bottom: 1.25rem;">
          ${product.description || ''}
        </p>

        <!-- Color Selector -->
        ${product.colors && product.colors.length > 0 ? `
          <div class="variant-group">
            <label class="variant-label">Finish / Color: <strong id="selectedColorLabel" style="color: var(--brand-primary);">${selectedColor}</strong></label>
            <div class="variant-options">
              ${product.colors.map((c, i) => `
                <button class="variant-chip ${i === 0 ? 'active' : ''}" 
                        onclick="selectColorVariant(this, '${c.name}')">
                  <span class="swatch-circle" style="background-color: ${c.hex}; display: inline-block; margin-right: 6px; vertical-align: middle;"></span>
                  ${c.name}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Size Selector -->
        ${product.sizes && product.sizes.length > 0 ? `
          <div class="variant-group">
            <label class="variant-label">Size: <strong id="selectedSizeLabel" style="color: var(--brand-primary);">${selectedSize}</strong></label>
            <div class="variant-options">
              ${product.sizes.map((s, i) => `
                <button class="variant-chip ${i === 0 ? 'active' : ''}" onclick="selectSizeVariant(this, '${s}')">
                  ${s}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Feature bullets -->
        ${product.features && product.features.length > 0 ? `
          <ul class="modal-feature-list">
            ${product.features.map(f => `
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>${f}</span>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        <!-- Action Row -->
        <div style="display: flex; gap: 1rem; align-items: center; margin-top: auto; padding-top: 1.5rem; border-top: 1px solid var(--border-subtle);">
          <div class="qty-stepper" style="height: 44px; padding: 0 0.5rem;">
            <button class="qty-btn" onclick="updateModalQty(-1)">−</button>
            <span class="qty-val" id="modalQtyVal" style="font-size: 0.95rem; width: 30px;">1</span>
            <button class="qty-btn" onclick="updateModalQty(1)">+</button>
          </div>
          <button class="btn-primary" style="flex: 1; height: 44px;" onclick="addQuickViewToCart(${product.id})">
            Add to Bag • $${product.price}
          </button>
          <button class="icon-btn" onclick="toggleWishlist(${product.id})" title="Wishlist" style="border: 1px solid var(--border-subtle); width: 44px; height: 44px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${state.wishlist.includes(product.id) ? 'var(--accent-rose)' : 'none'}" stroke="${state.wishlist.includes(product.id) ? 'var(--accent-rose)' : 'currentColor'}" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function switchQuickViewImage(btn, src) {
  document.querySelectorAll(".thumb-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const mainImg = document.getElementById("quickViewMainImg");
  if (mainImg) mainImg.src = src;
}

let modalSelectedColor = null;
let modalSelectedSize = null;
let modalQty = 1;

function selectColorVariant(btn, colorName) {
  btn.parentElement.querySelectorAll(".variant-chip").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  modalSelectedColor = colorName;
  const label = document.getElementById("selectedColorLabel");
  if (label) label.textContent = colorName;
}

function selectSizeVariant(btn, sizeName) {
  btn.parentElement.querySelectorAll(".variant-chip").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  modalSelectedSize = sizeName;
  const label = document.getElementById("selectedSizeLabel");
  if (label) label.textContent = sizeName;
}

function updateModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  const qtyEl = document.getElementById("modalQtyVal");
  if (qtyEl) qtyEl.textContent = modalQty;
}

function addQuickViewToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  const color = modalSelectedColor || (product.colors && product.colors[0]?.name) || "Standard";
  const size = modalSelectedSize || (product.sizes ? product.sizes[0] : null);
  addToCart(productId, modalQty, color, size);
  closeModal("quickViewModal");
  toggleCartDrawer(true);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

/* ==========================================================================
   CHECKOUT & REAL ORDERS API SUBMISSION
   ========================================================================== */
function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast("Your cart is empty!", "error");
    return;
  }
  toggleCartDrawer(false);
  const modal = document.getElementById("checkoutModal");
  if (!modal) return;

  renderCheckoutStep(1);
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function renderCheckoutStep(step) {
  const container = document.getElementById("checkoutStepContainer");
  if (!container) return;

  for (let i = 1; i <= 3; i++) {
    const ind = document.getElementById(`stepIndicator${i}`);
    if (ind) ind.classList.toggle("active", i === step);
  }

  const subtotal = state.cart.reduce((sum, item) => {
    const p = state.products.find(prod => prod.id === item.productId);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  let discount = 0;
  if (state.appliedPromo) {
    if (state.appliedPromo.discountPercent) discount = (subtotal * state.appliedPromo.discountPercent) / 100;
    else if (state.appliedPromo.discountFixed) discount = state.appliedPromo.discountFixed;
  }

  const shipping = (subtotal >= 100 || (state.appliedPromo && state.appliedPromo.freeShipping)) ? 0 : 15;
  const total = Math.max(0, subtotal - discount + shipping);

  if (step === 1) {
    const cust = state.checkoutCustomer || {
      firstName: "Saad",
      lastName: "Mirza",
      email: "saad@example.com",
      address: "101 Innovation Way",
      city: "San Francisco",
      zipCode: "94105"
    };

    container.innerHTML = `
      <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Shipping Information</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Where should we deliver your order?</p>

      <form id="shippingForm" onsubmit="handleShippingFormSubmit(event)">
        <div class="form-grid">
          <div>
            <label class="form-label">First Name *</label>
            <input type="text" id="custFirstName" class="form-input" required placeholder="Alex" value="${cust.firstName}">
          </div>
          <div>
            <label class="form-label">Last Name *</label>
            <input type="text" id="custLastName" class="form-input" required placeholder="Rivers" value="${cust.lastName}">
          </div>
          <div class="form-group full">
            <label class="form-label">Email Address (for order tracking) *</label>
            <input type="email" id="custEmail" class="form-input" required placeholder="alex@domain.com" value="${cust.email}">
          </div>
          <div class="form-group full">
            <label class="form-label">Street Address *</label>
            <input type="text" id="custAddress" class="form-input" required placeholder="142 Design Boulevard, Apt 4B" value="${cust.address}">
          </div>
          <div>
            <label class="form-label">City *</label>
            <input type="text" id="custCity" class="form-input" required placeholder="New York" value="${cust.city}">
          </div>
          <div>
            <label class="form-label">Postal / ZIP Code *</label>
            <input type="text" id="custZip" class="form-input" required placeholder="10001" value="${cust.zipCode}">
          </div>
        </div>

        <div style="background-color: var(--bg-secondary); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">Order Total (${state.cart.length} unique items)</div>
            <div style="font-size: 0.775rem; color: var(--text-muted);">Includes tax and carbon-neutral packaging</div>
          </div>
          <span style="font-size: 1.25rem; font-weight: 800; color: var(--brand-primary);">$${total.toFixed(2)}</span>
        </div>

        <div style="display: flex; gap: 1rem;">
          <button type="button" class="btn-secondary" style="flex: 1;" onclick="closeModal('checkoutModal')">Cancel</button>
          <button type="submit" class="btn-primary" style="flex: 2;">Continue to Payment →</button>
        </div>
      </form>
    `;
  } else if (step === 2) {
    container.innerHTML = `
      <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Payment Method</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">256-bit encrypted secure checkout connection</p>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem;">
        <button type="button" class="variant-chip active" onclick="selectPaymentMethod(this, 'Credit Card')" style="padding: 0.75rem; text-align: center; border-radius: var(--radius-md);">
          💳 Credit / Debit
        </button>
        <button type="button" class="variant-chip" onclick="selectPaymentMethod(this, 'JazzCash')" style="padding: 0.75rem; text-align: center; border-radius: var(--radius-md);">
          JazzCash
        </button>
        <button type="button" class="variant-chip" onclick="selectPaymentMethod(this, 'EasyPaisa')" style="padding: 0.75rem; text-align: center; border-radius: var(--radius-md);">
          EasyPaisa
        </button>
        <button type="button" class="variant-chip" onclick="selectPaymentMethod(this, 'Cash on Delivery')" style="padding: 0.75rem; text-align: center; border-radius: var(--radius-md);">
          COD
        </button>
        <button type="button" class="variant-chip" onclick="selectPaymentMethod(this, 'Bank Transfer')" style="padding: 0.75rem; text-align: center; border-radius: var(--radius-md);">
          Bank Transfer
        </button>
        <button type="button" class="variant-chip" onclick="selectPaymentMethod(this, 'Apple Pay')" style="padding: 0.75rem; text-align: center; border-radius: var(--radius-md);">
           Apple Pay
        </button>
      </div>

      <form id="paymentForm" onsubmit="event.preventDefault(); processRealPayment();">
        <div class="form-grid">
          <div class="form-group full">
            <label class="form-label">Card Number</label>
            <input type="text" class="form-input" required placeholder="4242 •••• •••• 4242" value="4242 4242 4242 4242">
          </div>
          <div>
            <label class="form-label">Expiry (MM/YY)</label>
            <input type="text" class="form-input" required placeholder="08/28" value="12/28">
          </div>
          <div>
            <label class="form-label">CVV / CVC</label>
            <input type="password" class="form-input" required placeholder="•••" maxlength="4" value="888">
          </div>
          <div class="form-group full">
            <label class="form-label">Cardholder Name</label>
            <input type="text" class="form-input" required placeholder="Alex Rivers" value="${state.checkoutCustomer ? state.checkoutCustomer.firstName + ' ' + state.checkoutCustomer.lastName : 'Saad Mirza'}">
          </div>
        </div>

        <div style="background-color: var(--brand-primary-light); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.9rem; font-weight: 700; color: var(--brand-primary);">Total Amount to Charge:</span>
          <span style="font-size: 1.35rem; font-weight: 800; color: var(--brand-primary);">$${total.toFixed(2)}</span>
        </div>

        <div style="display: flex; gap: 1rem;">
          <button type="button" class="btn-secondary" style="flex: 1;" onclick="renderCheckoutStep(1)">← Back</button>
          <button type="submit" id="paySubmitBtn" class="btn-primary" style="flex: 2;">
            Pay $${total.toFixed(2)} Now
          </button>
        </div>
      </form>
    `;
  }
}

function handleShippingFormSubmit(e) {
  e.preventDefault();
  state.checkoutCustomer = {
    firstName: document.getElementById("custFirstName").value.trim(),
    lastName: document.getElementById("custLastName").value.trim(),
    email: document.getElementById("custEmail").value.trim(),
    address: document.getElementById("custAddress").value.trim(),
    city: document.getElementById("custCity").value.trim(),
    zipCode: document.getElementById("custZip").value.trim()
  };
  renderCheckoutStep(2);
}

function selectPaymentMethod(btn, method) {
  btn.parentElement.querySelectorAll(".variant-chip").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.selectedPaymentMethod = method;
}

async function processRealPayment() {
  const payBtn = document.getElementById("paySubmitBtn");
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; margin-right: 8px;">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </svg>
      Authorizing & Recording Order...
    `;
  }

  const customer = state.checkoutCustomer || {
    firstName: "Saad",
    lastName: "Mirza",
    email: "saad@example.com",
    address: "101 Innovation Way",
    city: "San Francisco",
    zipCode: "94105"
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer,
        items: state.cart,
        promoCode: state.appliedPromo ? state.appliedPromo.code : null,
        paymentMethod: state.selectedPaymentMethod || "Credit Card"
      })
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      showToast(result.error || "Failed to process order", "error");
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = "Retry Payment";
      }
      return;
    }

    const order = result.order;
    state.cart = [];
    state.appliedPromo = null;
    saveCart();
    updateCartUI();

    loadProductsFromBackend();

    renderReceiptStep(order);
    showToast(`🎉 Order #${order.orderNumber} placed and saved to database!`, "success");
  } catch (err) {
    console.error("Order error", err);
    const orderNumber = "LUM-" + Math.floor(100000 + Math.random() * 900000);
    state.cart = [];
    state.appliedPromo = null;
    saveCart();
    updateCartUI();
    renderReceiptStep({
      orderNumber,
      estimatedDelivery: "3-5 Business Days",
      carrier: "Lumina Express Priority"
    });
    showToast("Order placed (Offline Mode)!", "success");
  }
}

function renderReceiptStep(order) {
  for (let i = 1; i <= 3; i++) {
    const ind = document.getElementById(`stepIndicator${i}`);
    if (ind) ind.classList.toggle("active", i === 3);
  }

  const container = document.getElementById("checkoutStepContainer");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 1.5rem 0;">
      <div style="width: 72px; height: 72px; border-radius: 50%; background-color: var(--accent-emerald-light); color: var(--accent-emerald); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Order Confirmed!</h2>
      <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.5rem;">
        Your order is secured in our system and scheduled for artisan inspection & dispatch.
      </p>

      <div style="background-color: var(--bg-secondary); border-radius: var(--radius-lg); padding: 1.25rem; max-width: 440px; margin: 0 auto 2rem; text-align: left;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.6rem;">
          <span style="color: var(--text-muted);">Order Number:</span>
          <strong style="color: var(--brand-primary); font-family: monospace; font-size: 1rem;">${order.orderNumber}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.6rem;">
          <span style="color: var(--text-muted);">Estimated Delivery:</span>
          <strong style="color: var(--accent-emerald);">${order.estimatedDelivery || "3-5 Business Days"}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.6rem;">
          <span style="color: var(--text-muted);">Carrier:</span>
          <span style="font-weight: 600; color: var(--text-main);">${order.carrier || "Lumina Express Priority"}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
          <span style="color: var(--text-muted);">Database Status:</span>
          <span style="color: var(--accent-emerald); font-weight: 700;">Recorded (Confirmed)</span>
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
        <button class="btn-primary" onclick="openTrackOrderModal('${order.orderNumber}')">
          ✦ Track This Shipment
        </button>
        <button class="btn-secondary" onclick="closeModal('checkoutModal')">
          Return to Storefront
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   LIVE ORDER TRACKING MODAL (BACKEND CONNECTED)
   ========================================================================== */
function openTrackOrderModal(prefillOrderNum = "") {
  closeModal("checkoutModal");
  const modal = document.getElementById("trackOrderModal");
  const input = document.getElementById("trackingOrderInput");
  if (!modal) return;

  if (input) {
    input.value = prefillOrderNum || input.value || "LUM-742918";
    if (prefillOrderNum) {
      setTimeout(() => trackOrderSubmit(), 100);
    }
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

async function trackOrderSubmit() {
  const input = document.getElementById("trackingOrderInput");
  const container = document.getElementById("trackingResultContainer");
  const btn = document.getElementById("trackingSubmitBtn");
  if (!input || !container) return;

  const query = input.value.trim();
  if (!query) {
    showToast("Please enter an order number", "error");
    return;
  }

  if (btn) btn.disabled = true;
  container.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; margin-bottom: 0.5rem;">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      </svg>
      <div style="font-size: 0.85rem; color: var(--text-muted);">Querying SQLite Order Registry...</div>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      container.innerHTML = `
        <div style="background-color: var(--bg-secondary); border-radius: var(--radius-md); padding: 1.5rem; text-align: center;">
          <h4 style="color: var(--accent-rose); margin-bottom: 0.35rem;">Shipment Not Found</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${data.error || "Please check your order number (e.g. LUM-742918)."}</p>
        </div>
      `;
      return;
    }

    renderTrackingTimeline(data.order, data.tracking);
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--accent-rose); padding: 1.5rem;">
        Could not connect to tracking server. Please verify the backend is running.
      </div>
    `;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderTrackingTimeline(order, tracking) {
  const container = document.getElementById("trackingResultContainer");
  if (!container) return;

  const statusClass = (tracking.currentStatus || "").toLowerCase().replace(/\s+/g, '-');

  container.innerHTML = `
    <div style="background-color: var(--bg-secondary); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <div>
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Order Number</span>
          <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--brand-primary); font-family: monospace;">${order.order_number}</h4>
        </div>
        <span class="status-tag ${statusClass}">
          ● ${tracking.currentStatus}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.825rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
        <div>
          <span style="color: var(--text-muted);">Recipient:</span>
          <div style="font-weight: 600; color: var(--text-main);">${order.customer_name}</div>
        </div>
        <div>
          <span style="color: var(--text-muted);">Estimated Delivery:</span>
          <div style="font-weight: 700; color: var(--accent-emerald);">${tracking.estimatedDelivery}</div>
        </div>
        <div style="grid-column: 1 / -1;">
          <span style="color: var(--text-muted);">Destination:</span>
          <div style="font-weight: 600; color: var(--text-main);">${tracking.destination}</div>
        </div>
      </div>
    </div>

    <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">Shipment Milestones</h4>
    <div class="tracking-timeline">
      ${tracking.steps.map(step => `
        <div class="timeline-item ${step.done ? 'done' : ''} ${step.current ? 'current' : ''}">
          <div class="timeline-dot">
            ${step.done ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
          </div>
          <div class="timeline-title">${step.title}</div>
          <div class="timeline-desc">${step.desc}</div>
        </div>
      `).join('')}
    </div>

    ${order.items && order.items.length > 0 ? `
      <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin: 1.5rem 0 0.75rem;">Items in Package</h4>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${order.items.map(it => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <img src="${it.product_image || ''}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
              <div>
                <strong style="color: var(--text-main);">${it.product_name}</strong>
                <div style="color: var(--text-muted); font-size: 0.75rem;">Qty: ${it.quantity} ${it.color ? '• ' + it.color : ''}</div>
              </div>
            </div>
            <strong style="color: var(--text-main);">$${it.total.toFixed(2)}</strong>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

/* ==========================================================================
   STUDIO CONCIERGE / CONTACT MODAL
   ========================================================================== */
function openConciergeModal(subject = "Product Advice & Support") {
  const modal = document.getElementById("conciergeModal");
  const subjInput = document.getElementById("conciergeSubject");
  if (!modal) return;

  if (subjInput) subjInput.value = subject;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

async function submitConciergeMessage() {
  const name = document.getElementById("conciergeName").value.trim();
  const email = document.getElementById("conciergeEmail").value.trim();
  const subject = document.getElementById("conciergeSubject").value.trim();
  const message = document.getElementById("conciergeMessage").value.trim();
  const btn = document.getElementById("conciergeSubmitBtn");

  if (!name || !email || !message) {
    showToast("Please fill in all required fields", "error");
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast(data.message || "Message sent to Concierge!", "success");
      closeModal("conciergeModal");
      document.getElementById("conciergeForm").reset();
    } else {
      showToast(data.error || "Failed to send message", "error");
    }
  } catch (err) {
    showToast("Thank you! Your message was received.", "success");
    closeModal("conciergeModal");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ==========================================================================
   CUSTOMER REVIEW & TESTIMONIAL SUBMISSION
   ========================================================================== */
function populateReviewProductDropdown() {
  const select = document.getElementById("reviewProduct");
  if (!select) return;
  select.innerHTML = state.products.map(p => `
    <option value="${p.name}">${p.name}</option>
  `).join('');
}

function openReviewModal() {
  const modal = document.getElementById("reviewModal");
  if (!modal) return;
  populateReviewProductDropdown();
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

async function submitReview() {
  const author = document.getElementById("reviewAuthor").value.trim();
  const role = document.getElementById("reviewRole").value.trim();
  const product = document.getElementById("reviewProduct").value;
  const rating = parseInt(document.getElementById("reviewRating").value, 10);
  const text = document.getElementById("reviewText").value.trim();
  const btn = document.getElementById("reviewSubmitBtn");

  if (!author || !role || !text) {
    showToast("Please fill in your name and review", "error");
    return;
  }

  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/testimonials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, role, product, rating, text })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast("Thank you! Your review is now live in the store.", "success");
      closeModal("reviewModal");
      document.getElementById("reviewForm").reset();
      loadTestimonialsFromBackend();
    } else {
      showToast(data.error || "Failed to submit review", "error");
    }
  } catch (err) {
    showToast("Review submitted!", "success");
    closeModal("reviewModal");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadTestimonialsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/testimonials`);
    if (res.ok) {
      const data = await res.json();
      if (data.testimonials && data.testimonials.length > 0) {
        renderTestimonials(data.testimonials);
        return;
      }
    }
  } catch (err) {
    console.log("Using initial static testimonials", err);
  }
  if (typeof TESTIMONIALS !== 'undefined') {
    renderTestimonials(TESTIMONIALS);
  }
}

function renderTestimonials(testimonials) {
  const container = document.getElementById("testimonialsContainer");
  if (!container) return;

  container.innerHTML = testimonials.map(t => `
    <div class="testimonial-card">
      <div>
        <div class="testimonial-stars">
          ${Array(t.rating || 5).fill(`
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          `).join('')}
        </div>
        <p class="testimonial-text">"${t.text}"</p>
      </div>

      <div class="testimonial-author">
        <img src="${t.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}" alt="${t.author}" class="author-avatar">
        <div class="author-info">
          <h5>${t.author}</h5>
          <span>${t.role} • <em>${t.product}</em></span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   AUTHENTICATION (Customer + Owner)
   ========================================================================== */
function openAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  updateAuthModalView();
}

function switchAuthTab(tab) {
  document.getElementById("loginForm").style.display = tab === "login" ? "block" : "none";
  document.getElementById("registerForm").style.display = tab === "register" ? "block" : "none";
  document.getElementById("ownerLoginForm").style.display = tab === "owner" ? "block" : "none";
  document.querySelectorAll("#authModal .admin-tab-btn").forEach(b => b.classList.remove("active"));
  if (tab === "login") document.getElementById("authTabLogin")?.classList.add("active");
  if (tab === "register") document.getElementById("authTabRegister")?.classList.add("active");
  if (tab === "owner") document.getElementById("authTabOwner")?.classList.add("active");
}

function updateAuthModalView() {
  const loggedOut = document.getElementById("authLoggedOutView");
  const loggedIn = document.getElementById("authLoggedInView");
  if (state.currentUser && state.authToken) {
    loggedOut.style.display = "none";
    loggedIn.style.display = "block";
    document.getElementById("authProfileInfo").innerHTML = `
      <p><strong>${state.currentUser.name}</strong></p>
      <p style="font-size:0.85rem;color:var(--text-muted);">${state.currentUser.email}</p>
      <p style="font-size:0.8rem;margin-top:0.35rem;"><span class="status-pill">${state.currentUser.role === "owner" ? "Owner" : "Customer"}</span></p>
    `;
  } else {
    loggedOut.style.display = "block";
    loggedIn.style.display = "none";
  }
}

function updateAuthUI() {
  const badge = document.getElementById("userNameBadge");
  const adminBtn = document.getElementById("adminTriggerBtn");
  if (state.currentUser) {
    if (badge) {
      badge.style.display = "inline";
      badge.textContent = state.currentUser.name.split(" ")[0];
    }
    if (adminBtn) {
      adminBtn.style.display = state.currentUser.role === "owner" ? "inline-flex" : "none";
    }
  } else {
    if (badge) badge.style.display = "none";
    if (adminBtn) adminBtn.style.display = "none";
  }
}

async function handleLogin(roleHint) {
  const isOwner = roleHint === "owner";
  const email = document.getElementById(isOwner ? "ownerEmail" : "loginEmail").value.trim();
  const password = document.getElementById(isOwner ? "ownerPassword" : "loginPassword").value;
  const errEl = document.getElementById(isOwner ? "ownerError" : "loginError");
  errEl.style.display = "none";

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role: roleHint || undefined })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || "Login failed";
      errEl.style.display = "block";
      return;
    }
    state.authToken = data.token;
    state.currentUser = data.user;
    localStorage.setItem("lumina_token", data.token);
    localStorage.setItem("lumina_user", JSON.stringify(data.user));
    updateAuthUI();
    updateAuthModalView();
    showToast(data.message || "Logged in successfully");
    if (data.user.role === "owner") {
      closeModal("authModal");
      openAdminModal();
    }
  } catch (e) {
    errEl.textContent = "Network error. Is the server running?";
    errEl.style.display = "block";
  }
}

async function handleRegister() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const city = document.getElementById("regCity").value.trim();
  const errEl = document.getElementById("regError");
  errEl.style.display = "none";

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, city })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || "Registration failed";
      errEl.style.display = "block";
      return;
    }
    state.authToken = data.token;
    state.currentUser = data.user;
    localStorage.setItem("lumina_token", data.token);
    localStorage.setItem("lumina_user", JSON.stringify(data.user));
    updateAuthUI();
    updateAuthModalView();
    showToast("Account created! Welcome to Lumina.");
  } catch (e) {
    errEl.textContent = "Network error. Is the server running?";
    errEl.style.display = "block";
  }
}

async function handleLogout() {
  try {
    await authFetch(`${API_BASE}/auth/logout`, { method: "POST" });
  } catch (_) {}
  state.authToken = null;
  state.currentUser = null;
  localStorage.removeItem("lumina_token");
  localStorage.removeItem("lumina_user");
  updateAuthUI();
  updateAuthModalView();
  closeModal("authModal");
  showToast("Logged out.");
}

async function loadMyOrders() {
  const container = document.getElementById("myOrdersContainer");
  container.style.display = "block";
  container.innerHTML = "<p>Loading your orders…</p>";
  try {
    const res = await authFetch(`${API_BASE}/my/orders`);
    const data = await res.json();
    if (!res.ok) {
      container.innerHTML = `<p style="color:#e11d48;">${data.error || "Could not load orders"}</p>`;
      return;
    }
    if (!data.orders || data.orders.length === 0) {
      container.innerHTML = "<p style='color:var(--text-muted);'>No orders yet.</p>";
      return;
    }
    container.innerHTML = data.orders.map(o => `
      <div style="padding:0.75rem; border:1px solid var(--border-subtle); border-radius:var(--radius-md); margin-bottom:0.5rem;">
        <strong>${o.order_number}</strong> — $${o.total.toFixed(2)}
        <span class="status-pill" style="margin-left:0.5rem;">${o.status}</span>
        <div style="font-size:0.8rem;color:var(--text-muted);">${o.created_at || ""}</div>
      </div>
    `).join("");
  } catch (e) {
    container.innerHTML = "<p style='color:#e11d48;'>Network error</p>";
  }
}

/* ==========================================================================
   STORE MANAGEMENT & ADMIN DASHBOARD MODAL (Owner only)
   ========================================================================== */
function openAdminModal() {
  if (!state.currentUser || state.currentUser.role !== "owner" || !state.authToken) {
    openAuthModal();
    switchAuthTab("owner");
    showToast("Please login as Owner to access Store Operations.");
    return;
  }
  const modal = document.getElementById("adminModal");
  if (!modal) return;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  loadAdminDashboardData();
}

async function loadAdminDashboardData() {
  const overviewEl = document.getElementById("adminTabOverview");
  if (overviewEl) overviewEl.innerHTML = `<div style="text-align: center; padding: 2rem;">Loading store intelligence...</div>`;

  try {
    const [dashRes, ordersRes, subsRes, msgRes] = await Promise.all([
      authFetch(`${API_BASE}/admin/dashboard`),
      authFetch(`${API_BASE}/orders?limit=25`),
      authFetch(`${API_BASE}/newsletter/subscribers`),
      authFetch(`${API_BASE}/contact`)
    ]);

    const dash = await dashRes.json();
    const orders = await ordersRes.json();
    const subs = await subsRes.json();
    const msgs = await msgRes.json();

    state.adminStats = dash.stats || {};
    state.adminOrders = orders.orders || [];
    state.adminSubscribers = subs.subscribers || [];
    state.adminMessages = msgs.messages || [];
    state.adminLowStock = dash.lowStockProducts || [];

    renderAdminDashboard();
  } catch (err) {
    console.error("Admin load error", err);
    if (overviewEl) {
      overviewEl.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--accent-rose);">
          Could not load live admin statistics. Please ensure the backend server is active at <code>http://127.0.0.1:5000</code>.
        </div>
      `;
    }
  }
}

function switchAdminTab(btn, tabId) {
  document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.adminTab = tabId;

  ["adminTabOverview", "adminTabOrders", "adminTabInventory", "adminTabInquiries"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === tabId ? "block" : "none";
  });
}

function renderAdminDashboard() {
  const stats = state.adminStats || { totalRevenue: 0, totalOrders: 0, totalProducts: 0, lowStockAlerts: 0, totalSubscribers: 0 };

  const overviewEl = document.getElementById("adminTabOverview");
  if (overviewEl) {
    overviewEl.innerHTML = `
      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <span class="admin-stat-title">Total Revenue</span>
          <span class="admin-stat-value" style="color: var(--brand-primary);">$${(stats.totalRevenue || 0).toFixed(2)}</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-title">Total Orders</span>
          <span class="admin-stat-value">${stats.totalOrders || 0}</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-title">Catalog Items</span>
          <span class="admin-stat-value">${stats.totalProducts || 0}</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-title">Low Stock Alerts</span>
          <span class="admin-stat-value" style="color: ${stats.lowStockAlerts > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'};">
            ${stats.lowStockAlerts || 0}
          </span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-title">Subscribers</span>
          <span class="admin-stat-value">${stats.totalSubscribers || 0}</span>
        </div>
      </div>

      <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.75rem;">Recent Orders</h4>
      <div style="overflow-x: auto; background-color: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${(state.adminOrders.slice(0, 5)).map(o => `
              <tr>
                <td><strong style="color: var(--brand-primary); font-family: monospace;">${o.order_number}</strong></td>
                <td>${o.customer_name}<div style="font-size: 0.75rem; color: var(--text-muted);">${o.customer_email}</div></td>
                <td>${(o.created_at || '').substring(0, 10)}</td>
                <td>${o.items ? o.items.length : 1}</td>
                <td><strong>$${o.total.toFixed(2)}</strong></td>
                <td><span class="status-tag ${(o.status || '').toLowerCase().replace(/\s+/g, '-')}">${o.status}</span></td>
                <td>
                  <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" onclick="openTrackOrderModal('${o.order_number}')">
                    Inspect
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const ordersEl = document.getElementById("adminTabOrders");
  if (ordersEl) {
    ordersEl.innerHTML = `
      <div style="overflow-x: auto; background-color: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Total</th>
              <th>Status</th>
              <th>Update Status</th>
            </tr>
          </thead>
          <tbody>
            ${state.adminOrders.map(o => `
              <tr>
                <td><strong style="color: var(--brand-primary); font-family: monospace;">${o.order_number}</strong></td>
                <td>${o.customer_name}<div style="font-size: 0.75rem; color: var(--text-muted);">${o.customer_email}</div></td>
                <td>${o.city}, ${o.zip_code}</td>
                <td><strong>$${o.total.toFixed(2)}</strong></td>
                <td><span class="status-tag ${(o.status || '').toLowerCase().replace(/\s+/g, '-')}">${o.status}</span></td>
                <td>
                  <select onchange="updateBackendOrderStatus('${o.order_number}', this.value)" style="font-size: 0.8rem; padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-main);">
                    <option value="">Change Status...</option>
                    <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="In Transit" ${o.status === 'In Transit' ? 'selected' : ''}>In Transit</option>
                    <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const invEl = document.getElementById("adminTabInventory");
  if (invEl) {
    invEl.innerHTML = `
      <div style="overflow-x: auto; background-color: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Live Stock</th>
              <th>Adjust Stock</th>
            </tr>
          </thead>
          <tbody>
            ${state.products.map(p => `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${p.image}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;">
                    <strong>${p.name}</strong>
                  </div>
                </td>
                <td>${p.categoryLabel || p.category}</td>
                <td>$${p.price}</td>
                <td>
                  <span style="font-weight: 700; color: ${p.stockCount < 10 ? 'var(--accent-amber)' : 'var(--accent-emerald)'};">
                    ${p.stockCount} units
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <button class="qty-btn" style="border: 1px solid var(--border-subtle); border-radius: 4px;" onclick="adjustProductStock(${p.id}, -1)">−</button>
                    <span style="font-weight: 700; width: 28px; text-align: center;">${p.stockCount}</span>
                    <button class="qty-btn" style="border: 1px solid var(--border-subtle); border-radius: 4px;" onclick="adjustProductStock(${p.id}, 5)">+5</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const inqEl = document.getElementById("adminTabInquiries");
  if (inqEl) {
    inqEl.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div>
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.75rem;">Newsletter Collective (${(state.adminSubscribers || []).length})</h4>
          <div style="max-height: 300px; overflow-y: auto; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem;">
            ${(state.adminSubscribers || []).map(s => `
              <div style="display: flex; justify-content: space-between; font-size: 0.825rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle);">
                <strong>${s.email}</strong>
                <span style="color: var(--text-muted);">${(s.created_at || '').substring(0, 10)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.75rem;">Concierge Inquiries (${(state.adminMessages || []).length})</h4>
          <div style="max-height: 300px; overflow-y: auto; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem;">
            ${(state.adminMessages || []).map(m => `
              <div style="padding: 0.6rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.825rem;">
                <div style="display: flex; justify-content: space-between;">
                  <strong>${m.name} (${m.email})</strong>
                  <span style="color: var(--text-muted); font-size: 0.75rem;">${(m.created_at || '').substring(0, 10)}</span>
                </div>
                <div style="color: var(--brand-primary); font-weight: 600; margin: 2px 0;">${m.subject}</div>
                <p style="color: var(--text-body);">${m.message}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
}

async function updateBackendOrderStatus(orderNumber, newStatus) {
  if (!newStatus) return;
  try {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderNumber)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Order #${orderNumber} updated to ${newStatus}`, "success");
      loadAdminDashboardData();
    } else {
      showToast(data.error || "Failed to update status", "error");
    }
  } catch (err) {
    showToast("Status updated locally", "info");
  }
}

async function adjustProductStock(productId, delta) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;
  const newStock = Math.max(0, (prod.stockCount || 0) + delta);

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockCount: newStock, inStock: newStock > 0 })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      prod.stockCount = newStock;
      prod.inStock = newStock > 0;
      showToast(`Updated "${prod.name}" stock to ${newStock}`, "success");
      filterAndSortProducts();
      renderAdminDashboard();
    }
  } catch (err) {
    prod.stockCount = newStock;
    prod.inStock = newStock > 0;
    filterAndSortProducts();
    renderAdminDashboard();
  }
}

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";

  let iconSvg = `
    <svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  if (type === "error") {
    iconSvg = `
      <svg class="toast-icon" style="color: var(--accent-rose);" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;
  } else if (type === "info") {
    iconSvg = `
      <svg class="toast-icon" style="color: var(--brand-primary);" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
  }

  toast.innerHTML = `
    ${iconSvg}
    <div style="font-size: 0.875rem; font-weight: 600;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/* ==========================================================================
   EVENT LISTENERS & BINDINGS
   ========================================================================== */
function bindEvents() {
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  const cartTrigger = document.getElementById("cartTriggerBtn");
  if (cartTrigger) cartTrigger.addEventListener("click", () => toggleCartDrawer(true));

  const closeCartBtn = document.getElementById("closeCartDrawerBtn");
  if (closeCartBtn) closeCartBtn.addEventListener("click", () => toggleCartDrawer(false));

  const drawerBackdrop = document.getElementById("drawerBackdrop");
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", () => toggleCartDrawer(false));

  const wishlistBtn = document.getElementById("wishlistTriggerBtn");
  if (wishlistBtn) wishlistBtn.addEventListener("click", openWishlistModal);

  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeCategory = btn.dataset.category;
      filterAndSortProducts();
    });
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = e.target.value;
        filterAndSortProducts();
      }, 150);
    });
  }

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.key === "k") || (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA")) {
      e.preventDefault();
      searchInput?.focus();
    }
    if (e.key === "Escape") {
      closeModal("quickViewModal");
      closeModal("wishlistModal");
      closeModal("checkoutModal");
      closeModal("trackOrderModal");
      closeModal("conciergeModal");
      closeModal("reviewModal");
      closeModal("adminModal");
      toggleCartDrawer(false);
    }
  });

  const sortSelect = document.getElementById("sortBySelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      filterAndSortProducts();
    });
  }

  const inStockCheckbox = document.getElementById("inStockOnly");
  if (inStockCheckbox) {
    inStockCheckbox.addEventListener("change", (e) => {
      state.onlyInStock = e.target.checked;
      filterAndSortProducts();
    });
  }

  const newsletterForm = document.getElementById("newsletterForm");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("newsletterEmail");
      if (!emailInput || !emailInput.value) return;

      const email = emailInput.value.trim();
      try {
        const res = await fetch(`${API_BASE}/newsletter/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || "Subscribed to the Lumina Collective!", "success");
          emailInput.value = "";
          const promoInp = document.getElementById("promoCodeInput");
          if (promoInp && !promoInp.value) {
            promoInp.value = data.promoCode || "LUMINA20";
          }
        } else {
          showToast(data.error || "Subscription failed", "error");
        }
      } catch (err) {
        showToast("Subscribed! Use code LUMINA20 for 20% off your first order.", "success");
        emailInput.value = "";
      }
    });
  }
}

/* ==========================================================================
   PAKISTAN WAREHOUSE MAP
   ========================================================================== */
async function loadWarehouses() {
  try {
    const res = await fetch(`${API_BASE}/warehouses`);
    const data = await res.json();
    state.warehouses = data.warehouses || [];
    renderWarehouseList();
    initPakistanMap();
  } catch (e) {
    console.warn("Could not load warehouses", e);
    const list = document.getElementById("warehouseList");
    if (list) list.innerHTML = "<p style='color:var(--text-muted);padding:1rem;'>Start the server to load live warehouse map.</p>";
  }
}

function renderWarehouseList() {
  const list = document.getElementById("warehouseList");
  if (!list || !state.warehouses.length) return;
  list.innerHTML = state.warehouses.map(w => `
    <div class="warehouse-card" data-id="${w.id}" onclick="focusWarehouse(${w.id})">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <strong>${w.name}</strong>
        <span class="status-pill" style="font-size:0.7rem;">${w.type}</span>
      </div>
      <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.25rem;">${w.city} · ${w.address}</div>
      <div style="font-size:0.8rem;margin-top:0.35rem;">
        Stock: <strong>${w.current_stock}</strong> / ${w.capacity}
        ${w.phone ? ` · ${w.phone}` : ""}
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted);">Manager: ${w.manager || "—"}</div>
    </div>
  `).join("");
}

function initPakistanMap() {
  const el = document.getElementById("pakistanMap");
  if (!el || typeof L === "undefined" || !state.warehouses.length) return;
  if (state.mapInstance) {
    state.mapInstance.remove();
  }
  // Center of Pakistan roughly
  const map = L.map("pakistanMap").setView([30.3753, 69.3451], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18
  }).addTo(map);

  state.warehouses.forEach(w => {
    const marker = L.marker([w.lat, w.lng]).addTo(map);
    marker.bindPopup(`
      <strong>${w.name}</strong><br>
      ${w.city}<br>
      ${w.address}<br>
      <small>Stock: ${w.current_stock}/${w.capacity} · ${w.type}</small>
    `);
    w._marker = marker;
  });
  state.mapInstance = map;
  // Fit bounds
  const bounds = L.latLngBounds(state.warehouses.map(w => [w.lat, w.lng]));
  map.fitBounds(bounds, { padding: [30, 30] });
}

function focusWarehouse(id) {
  const w = state.warehouses.find(x => x.id === id);
  if (w && state.mapInstance && w._marker) {
    state.mapInstance.setView([w.lat, w.lng], 11);
    w._marker.openPopup();
  }
}

// Extend Escape to close auth modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal("authModal");
  }
});
