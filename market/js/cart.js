/**
 * cart.js — Electro E-Commerce Cart System
 * ==========================================
 * Vanilla JS only. localStorage-backed. Works across all pages.
 *
 * Public API (called from HTML via onclick or DOMContentLoaded):
 *   Cart.add(name, price, image)   — add/increment a product
 *   Cart.remove(id)                — remove a product entirely
 *   Cart.updateQty(id, delta)      — change quantity by +1 or -1
 *   Cart.renderCheckout()          — render the checkout table
 *   Cart.updateNavbar()            — refresh cart icon count + total
 */
console.log("cart loaded");
const Cart = (() => {
  // ─── Storage Key ────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'electro_cart';

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Load cart array from localStorage. Always returns an array. */
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  /** Persist cart array to localStorage. */
  function save(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  /**
   * Generate a stable ID from product name so the same product
   * is always recognised as a duplicate across pages.
   */
  function makeId(name) {
    return name.trim().toLowerCase().replace(/\s+/g, '-');
  }

  /** Format a number as "$1,234.00" */
  function fmt(n) {
    return '$' + Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ─── Core Operations ────────────────────────────────────────────────────────

  /**
   * Add a product to the cart.
   * If the product already exists (matched by id), increment its quantity.
   * @param {string} name   - Product name
   * @param {number} price  - Unit price (numeric, no $ sign)
   * @param {string} image  - Image src path
   * @param {number} qty    - Quantity to add (default 1)
   */
  function add(name, price, image, qty = 1) {
    const cart = load();
    const id   = makeId(name);
    const idx  = cart.findIndex(item => item.id === id);

    if (idx > -1) {
      // Duplicate → increment
      cart[idx].qty += qty;
    } else {
      // New item
      cart.push({ id, name, price: parseFloat(price), image, qty });
    }

    save(cart);
    updateNavbar();
    _flashCartIcon();
  }

  /**
   * Remove an item from the cart completely.
   * @param {string} id - Product id (same format as makeId)
   */
  function remove(id) {
    const cart = load().filter(item => item.id !== id);
    save(cart);
    updateNavbar();
    renderCheckout(); // re-render if on checkout page
  }

  /**
   * Change quantity by a delta (+1 or -1).
   * Removes the item if qty drops to 0.
   * @param {string} id    - Product id
   * @param {number} delta - +1 or -1
   */
  function updateQty(id, delta) {
    const cart = load();
    const idx  = cart.findIndex(item => item.id === id);
    if (idx === -1) return;

    cart[idx].qty = Math.max(0, cart[idx].qty + delta);

    if (cart[idx].qty === 0) {
      cart.splice(idx, 1); // auto-remove when qty reaches zero
    }

    save(cart);
    updateNavbar();
    renderCheckout();
  }

  // ─── Navbar Update ──────────────────────────────────────────────────────────

  /**
   * Update every cart icon + total in the navbar.
   * Targets all elements with [data-cart-count] and [data-cart-total].
   */
  function updateNavbar() {
    const cart      = load();
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const total     = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    // Cart count badges
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = itemCount;
      el.style.display = itemCount > 0 ? 'inline-block' : 'none';
    });

    // Cart total displays
    document.querySelectorAll('[data-cart-total]').forEach(el => {
      el.textContent = fmt(total);
    });
  }

  /** Brief CSS animation on cart icon to confirm addition */
  function _flashCartIcon() {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.classList.add('cart-badge-flash');
      setTimeout(() => el.classList.remove('cart-badge-flash'), 600);
    });
  }

  // ─── Checkout Page Renderer ─────────────────────────────────────────────────

  /**
   * Render cart items into the checkout table.
   * Expects an element with id="cart-table-body" for rows,
   * id="cart-subtotal" for subtotal value,
   * id="cart-total" for final total value.
   */
  function renderCheckout() {
    const tbody    = document.getElementById('cart-table-body');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl    = document.getElementById('cart-total');
    const emptyMsg   = document.getElementById('cart-empty-msg');

    if (!tbody) return; // not on checkout page

    const cart = load();

    // Empty cart state
    if (cart.length === 0) {
      tbody.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (subtotalEl) subtotalEl.textContent = fmt(0);
      if (totalEl)    totalEl.textContent    = fmt(0);
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    // Build rows
    tbody.innerHTML = cart.map(item => {
      const lineTotal = item.price * item.qty;
      return `
        <tr class="text-center cart-row" data-id="${item.id}">
          <th scope="row" class="text-start py-3">
            <div class="d-flex align-items-center gap-3">
              <img src="${item.image}" alt="${item.name}"
                   style="width:54px;height:54px;object-fit:contain;"
                   class="rounded border p-1">
              <span>${item.name}</span>
            </div>
          </th>
          <td class="py-3 align-middle">${fmt(item.price)}</td>
          <td class="py-3 align-middle">
            <div class="d-flex align-items-center justify-content-center gap-2">
              <button class="btn btn-sm btn-outline-secondary rounded-circle cart-qty-btn"
                      onclick="Cart.updateQty('${item.id}', -1)"
                      aria-label="Decrease quantity">
                <i class="fa fa-minus fa-xs"></i>
              </button>
              <span class="fw-bold" style="min-width:24px;">${item.qty}</span>
              <button class="btn btn-sm btn-outline-secondary rounded-circle cart-qty-btn"
                      onclick="Cart.updateQty('${item.id}', 1)"
                      aria-label="Increase quantity">
                <i class="fa fa-plus fa-xs"></i>
              </button>
            </div>
          </td>
          <td class="py-3 align-middle fw-bold text-primary">${fmt(lineTotal)}</td>
          <td class="py-3 align-middle">
            <button class="btn btn-sm btn-danger rounded-pill px-3"
                    onclick="Cart.remove('${item.id}')"
                    aria-label="Remove ${item.name}">
              <i class="fa fa-times me-1"></i> Remove
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Subtotal & total (no shipping selected by default)
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
    if (totalEl)    totalEl.textContent    = fmt(subtotal); // shipping added separately

    // Wire up shipping checkboxes to recalculate total
    _bindShipping(subtotal);
  }

  /**
   * Recalculate grand total when a shipping option is selected.
   * @param {number} subtotal
   */
  function _bindShipping(subtotal) {
    const shippingMap = { 'Shipping-1': 0, 'Shipping-2': 15, 'Shipping-3': 8 };
    const totalEl     = document.getElementById('cart-total');
    if (!totalEl) return;

    Object.keys(shippingMap).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        // Uncheck others (treat as radio)
        Object.keys(shippingMap).forEach(otherId => {
          const other = document.getElementById(otherId);
          if (other && otherId !== id) other.checked = false;
        });
        const shipping = el.checked ? shippingMap[id] : 0;
        totalEl.textContent = fmt(subtotal + shipping);
      });
    });
  }

  // ─── "Add to Cart" Button Wiring ────────────────────────────────────────────

  /**
   * Wire up all .btn-add-to-cart elements on the page.
   * Each button needs data attributes:
   *   data-name   = product name
   *   data-price  = numeric price (e.g. 1050.00)
   *   data-image  = relative image path
   */
  function _wireProductButtons() {
    document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const name  = this.dataset.name;
        const price = parseFloat(this.dataset.price);
        const image = this.dataset.image;
        if (!name || isNaN(price)) {
          console.warn('Cart: missing data-name or data-price on button', this);
          return;
        }
        Cart.add(name, price, image);

        // Visual feedback on the button
        const original = this.innerHTML;
        this.innerHTML = '<i class="fas fa-check me-2"></i> Added!';
        this.classList.add('btn-success');
        this.classList.remove('btn-primary');
        setTimeout(() => {
          this.innerHTML = original;
          this.classList.remove('btn-success');
          this.classList.add('btn-primary');
        }, 1200);
      });
    });
  }

  // ─── Single-Product Page ────────────────────────────────────────────────────

  /**
   * Wire up the quantity +/- buttons on single.html and the
   * "Add to cart" button which reads the current qty input.
   */
  function _wireSingleProduct() {
    const qtyInput = document.getElementById('single-qty');
    const minusBtn = document.getElementById('single-qty-minus');
    const plusBtn  = document.getElementById('single-qty-plus');
    const addBtn   = document.getElementById('single-add-to-cart');

    if (!qtyInput) return;

    minusBtn && minusBtn.addEventListener('click', () => {
      const v = parseInt(qtyInput.value) || 1;
      qtyInput.value = Math.max(1, v - 1);
    });

    plusBtn && plusBtn.addEventListener('click', () => {
      const v = parseInt(qtyInput.value) || 1;
      qtyInput.value = v + 1;
    });

    addBtn && addBtn.addEventListener('click', e => {
      e.preventDefault();
      const qty   = parseInt(qtyInput.value) || 1;
      const name  = addBtn.dataset.name;
      const price = parseFloat(addBtn.dataset.price);
      const image = addBtn.dataset.image;
      if (!name || isNaN(price)) return;

      Cart.add(name, price, image, qty);

      // Feedback
      const original = addBtn.innerHTML;
      addBtn.innerHTML = '<i class="fas fa-check me-2 text-white"></i> Added to cart!';
      addBtn.classList.add('btn-success');
      setTimeout(() => {
        addBtn.innerHTML = original;
        addBtn.classList.remove('btn-success');
      }, 1400);
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  /** Called once when the DOM is ready. */
  function init() {
    updateNavbar();
    _wireProductButtons();
    _wireSingleProduct();
    renderCheckout(); // no-op on non-checkout pages
  }

  document.addEventListener('DOMContentLoaded', init);

  // ─── Public API ──────────────────────────────────────────────────────────────
  return { add, remove, updateQty, updateNavbar, renderCheckout };

})();
