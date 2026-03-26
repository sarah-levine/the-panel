// Content script — per-site selectors when available, generic fallback otherwise.

import { getRetailer, isShopify } from './retailers'

// ─── Cart/bag page detection ─────────────────────────────────────────────────

const CART_PATH_PATTERNS = ['/cart', '/bag', '/basket', '/shopping-bag', '/shoppingbag', '/shopping/bag', '/checkout/cart']

// Active retailer config (set during init)
let activeRetailer = null

function isCartPage() {
  const path = window.location.pathname.toLowerCase()
  // Check retailer-specific cart path first
  if (activeRetailer?.cartPath && path.includes(activeRetailer.cartPath)) return true
  return CART_PATH_PATTERNS.some(p => path.includes(p))
}

// ─── Add-to-cart button detection ────────────────────────────────────────────

const ADD_BUTTON_PATTERNS = ['add to bag', 'add to cart', 'add to basket', 'add to shopping bag']

function isAddToCartButton(btn) {
  const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase().trim()
  return ADD_BUTTON_PATTERNS.some(p => text.includes(p))
}

// ─── Price regex ─────────────────────────────────────────────────────────────

const PRICE_RE = /[\$£€¥₹]\s?[\d,.]+|[\d,.]+\s?(USD|GBP|EUR|CAD|AUD)/
const PRICE_RE_ANCHORED = /^[\s]*[\$£€¥₹]\s?[\d,.]+[\s]*$/

// ─── Mini-cart / flyout selectors ────────────────────────────────────────────

const MINI_CART_SELECTORS = [
  '[class*="mini-cart"]', '[class*="mini-bag"]', '[class*="minicart"]', '[class*="minibag"]',
  '[class*="cart-flyout"]', '[class*="bag-flyout"]',
  '[class*="cart-modal"]', '[class*="bag-modal"]',
  '[class*="cart-drawer"]', '[class*="bag-drawer"]',
  '[class*="cart-overlay"]', '[class*="bag-overlay"]',
  '[class*="added-to-bag"]', '[class*="added-to-cart"]', '[class*="addedToBag"]',
  '[class*="addedToBag"]', '[class*="AddToBag"]', '[class*="add-to-bag"]',
  '[data-testid*="mini-cart"]', '[data-testid*="mini-bag"]',
  '[data-testid*="minicart"]', '[data-testid*="minibag"]',
  '[role="dialog"]',
].join(', ')

function isVisible(el) {
  if (!el) return false
  const style = window.getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

// ─── Non-product name blocklist ──────────────────────────────────────────────

const NAME_BLOCKLIST = /^(promo\s*code|coupon|gift\s*card|order\s*summary|sub\s*total|shipping|estimated\s*tax|proceed|checkout|pay\s*with|total|added\s*to|view\s*bag|continue\s*shopping|shop\s*now|free\s*shipping|sign\s*up|get\s*\$|product\s*highlights|product\s*details|size\s*guide|you\s*may\s*also|recently\s*viewed|customers\s*also|reviews|write\s*a\s*review|top\s*rated|members\s*get|earn\s*\d|free\s*returns|\d+%\s*of\s*net|questions\s*about|chat\s*with|expected\s*to\s*ship|available\s*on\s*orders|skip\s*to|looking\s*for\s*this|your\s*bag\s*is|main\s*content|cookie|accept\s*all|privacy\s*policy)/i

// ─── Generic cart page parser ────────────────────────────────────────────────

const PRODUCT_LINK_PATTERNS = /\/(shop|product|prd|p|s|item|pd)\//i
const RECO_SECTION = '[class*="recommend"], [class*="recently"], [class*="you-may"], [class*="upsell"], [class*="also-like"], [class*="picked-for"], [class*="PickedForYou"], [class*="looking-for"], [class*="LookingFor"], [class*="suggestions"], [class*="empty-cart"]'

function parseCartPage() {
  // Strategy 0: Shopify /cart.js — most reliable when available
  // (async, handled separately in watchCartPage)

  // Strategy 1: Per-site selectors — if the retailer config has them
  if (activeRetailer?.cartItemSelector) {
    const selectorItems = parseCartViaSelectors()
    if (selectorItems.length > 0) return selectorItems
  }

  // Strategy 2: Find product links on the page, walk up to find item blocks
  const linkItems = parseCartViaLinks()

  // Strategy 3: Find product images, walk up to find item blocks
  const imageItems = parseCartViaImages()

  // Use whichever strategy found more items
  return linkItems.length >= imageItems.length ? linkItems : imageItems
}

// ─── Shopify /cart.js parser ─────────────────────────────────────────────────

async function parseShopifyCart() {
  try {
    const res = await fetch('/cart.js', { credentials: 'same-origin' })
    if (!res.ok) return []
    const data = await res.json()
    if (!data.items || !Array.isArray(data.items)) return []
    return data.items.map(item => ({
      name: item.title || item.product_title || '',
      price: item.price ? '$' + (item.price / 100).toFixed(2) : '',
      imageUrl: item.image || item.featured_image?.url || '',
      url: item.url ? window.location.origin + item.url : '',
    })).filter(i => i.name)
  } catch (e) {
    return []
  }
}

// ─── Per-site selector parser ────────────────────────────────────────────────

function parseCartViaSelectors() {
  const items = []
  const seen = new Set()
  const blocks = document.querySelectorAll(activeRetailer.cartItemSelector)

  for (const block of blocks) {
    if (block.closest(RECO_SECTION)) continue

    // Get product name
    const nameEl = activeRetailer.nameSelector
      ? block.querySelector(activeRetailer.nameSelector)
      : null
    let name = nameEl?.textContent?.trim() || ''

    // Fallback: try common name patterns
    if (!name || name.length < 4) {
      const fallback = block.querySelector('a[href*="/shop/"], a[href*="/product/"], a[href*="/prd/"], a[href*="/p/"], h2, h3, h4, h5')
      name = fallback?.textContent?.trim() || ''
    }

    if (!name || name.length < 4 || NAME_BLOCKLIST.test(name)) continue

    // Get price
    let price = ''
    const priceEl = activeRetailer.priceSelector
      ? block.querySelector(activeRetailer.priceSelector)
      : block.querySelector('[class*="price"]')
    if (priceEl) {
      const m = priceEl.textContent.match(PRICE_RE)
      if (m) price = m[0]
    }

    // Get image
    const img = block.querySelector('img')
    const imgSrc = img ? (img.currentSrc || img.src || img.dataset.src || '') : ''

    // Get product link
    const link = block.querySelector('a[href*="/shop/"], a[href*="/product/"], a[href*="/prd/"], a[href*="/p/"], a[href*="/s/"], a[href*="/item/"]')

    if (!seen.has(name)) {
      seen.add(name)
      items.push({
        name,
        price,
        imageUrl: imgSrc,
        url: link?.href || '',
      })
    }
  }

  return items
}

function parseCartViaLinks() {
  const items = []
  const seen = new Set()

  // Find all links that point to product pages
  const productLinks = document.querySelectorAll('a[href]')
  for (const link of productLinks) {
    const href = link.getAttribute('href') || ''
    if (!PRODUCT_LINK_PATTERNS.test(href)) continue
    if (link.closest(RECO_SECTION)) continue

    // The link text is likely the product name
    const linkText = link.textContent?.trim() || ''
    if (!linkText || linkText.length < 4) continue
    if (NAME_BLOCKLIST.test(linkText)) continue
    if (/^[\$£€¥₹]/.test(linkText)) continue
    if (/^(edit|remove|save|view|shop\s*all)/i.test(linkText)) continue

    // Walk up to find a container with a price
    let block = link.parentElement
    for (let i = 0; i < 12 && block && block !== document.body; i++) {
      const text = block.textContent || ''
      if (PRICE_RE.test(text)) {
        // Check this block has an image and isn't too big
        const img = block.querySelector('img')
        const imgSrc = img ? (img.currentSrc || img.src || img.dataset.src || '') : ''
        if (imgSrc && block.querySelectorAll('a[href]').length <= 10) {
          let price = ''
          const priceEl = block.querySelector('[class*="price"]')
          if (priceEl) {
            const m = priceEl.textContent.match(PRICE_RE)
            if (m) price = m[0]
          }
          if (!price) {
            const m = text.match(PRICE_RE)
            if (m) price = m[0]
          }

          const name = linkText
          if (!seen.has(name)) {
            seen.add(name)
            items.push({ name, price, imageUrl: imgSrc, url: link.href })
          }
          break
        }
      }
      block = block.parentElement
    }
  }
  return items
}

function parseCartViaImages() {
  const items = []
  const seen = new Set()
  const allImages = document.querySelectorAll('img')

  for (const imgEl of allImages) {
    const rect = imgEl.getBoundingClientRect()
    if (rect.width > 0 && rect.width < 40 && rect.height > 0 && rect.height < 40) continue
    const imgSrc = imgEl.currentSrc || imgEl.src || imgEl.dataset.src || ''
    if (!imgSrc || imgSrc.startsWith('data:image/svg')) continue
    if (imgEl.closest(RECO_SECTION)) continue

    let block = imgEl.parentElement
    for (let i = 0; i < 12 && block && block !== document.body; i++) {
      const text = block.textContent || ''
      const hasPrice = PRICE_RE.test(text)
      const imgCount = block.querySelectorAll('img').length
      if (hasPrice && imgCount <= 5) {
        const item = extractItemFromBlock(block)
        if (item && !seen.has(item.name)) {
          seen.add(item.name)
          items.push(item)
        }
        break
      }
      if (imgCount > 10) break
      block = block.parentElement
    }
  }
  return items
}

// ─── Generic product page parser ─────────────────────────────────────────────

function parseProductPage() {
  const name = document.querySelector('h1')?.textContent?.trim() || ''

  let price = ''
  const priceSelectors = [
    '[class*="current-price"]', '[class*="product-price"]', '[class*="sale-price"]',
    '[class*="price"] span', '[class*="price"]', '[data-testid*="price"]',
  ]
  for (const sel of priceSelectors) {
    const el = document.querySelector(sel)
    if (el) {
      const match = el.textContent.match(PRICE_RE)
      if (match) { price = match[0]; break }
    }
  }
  if (!price) {
    const allEls = document.querySelectorAll('span, p, div')
    for (const el of allEls) {
      if (el.children.length > 2) continue
      const match = el.textContent.match(PRICE_RE_ANCHORED)
      if (match) { price = match[0].trim(); break }
    }
  }

  const img = document.querySelector(
    '[class*="product"] img[src*="http"], [class*="gallery"] img[src*="http"], [class*="hero"] img[src*="http"]'
  )?.src || document.querySelector('img[src*="http"]')?.src || ''

  if (!name) return null
  return { name, price, imageUrl: img, url: window.location.href }
}

// ─── Parse mini-cart / flyout DOM ────────────────────────────────────────────

function parseMiniCart(container) {
  const items = []
  const seen = new Set()

  // Try extractItemFromBlock on sub-elements within the flyout
  const images = container.querySelectorAll('img')
  for (const imgEl of images) {
    const rect = imgEl.getBoundingClientRect()
    if (rect.width > 0 && rect.width < 40 && rect.height > 0 && rect.height < 40) continue
    const imgSrc = imgEl.currentSrc || imgEl.src || imgEl.dataset.src || ''
    if (!imgSrc || imgSrc.startsWith('data:image/svg')) continue

    let block = imgEl.parentElement
    for (let i = 0; i < 8 && block && block !== container; i++) {
      const text = block.textContent || ''
      if (PRICE_RE.test(text) && block.querySelectorAll('img').length <= 3) {
        const item = extractItemFromBlock(block)
        if (item && !seen.has(item.name)) {
          seen.add(item.name)
          items.push(item)
        }
        break
      }
      block = block.parentElement
    }
  }

  // Fallback: grab heading + price from the container directly
  if (items.length === 0) {
    const heading = container.querySelector('h2, h3, h4, h5, [class*="product-name"], [class*="item-name"]')
    const name = heading?.textContent?.trim() || ''
    if (name && name.length >= 4 && !NAME_BLOCKLIST.test(name)) {
      let price = ''
      const priceEl = container.querySelector('[class*="price"]')
      if (priceEl) {
        const m = priceEl.textContent.match(PRICE_RE)
        if (m) price = m[0]
      }
      const img = container.querySelector('img')
      const imgSrc = img ? (img.currentSrc || img.src || img.dataset.src || '') : ''
      items.push({ name, price, imageUrl: imgSrc, url: window.location.href })
    }
  }

  return items
}

// ─── Extract items from API response JSON ────────────────────────────────────

function extractItemsFromApiResponse(data) {
  // Recursively search for arrays of item-like objects
  const items = []

  function isItemLike(obj) {
    if (!obj || typeof obj !== 'object') return false
    const keys = Object.keys(obj)
    const hasName = keys.some(k => /^(name|title|productName|product_name|description)$/i.test(k))
    const hasPrice = keys.some(k => /^(price|unitPrice|unit_price|salePrice|sale_price|currentPrice|current_price)$/i.test(k))
    return hasName && hasPrice
  }

  function extractItem(obj) {
    const name = obj.name || obj.title || obj.productName || obj.product_name || obj.description || ''
    let price = obj.price || obj.unitPrice || obj.salePrice || obj.currentPrice || ''
    if (typeof price === 'object') {
      price = price.current?.text || price.display || price.value || price.formatted || ''
    }
    price = String(price)
    const imageUrl = obj.imageUrl || obj.image?.url || obj.images?.[0]?.url || obj.thumbnail || obj.image || ''
    const url = obj.url || obj.productUrl || obj.product_url || ''
    return name ? { name: String(name), price, imageUrl: String(imageUrl), url: String(url) } : null
  }

  function walk(node) {
    if (items.length > 0) return // found items, stop
    if (Array.isArray(node)) {
      const itemLike = node.filter(isItemLike)
      if (itemLike.length > 0) {
        for (const obj of itemLike) {
          const item = extractItem(obj)
          if (item) items.push(item)
        }
        return
      }
      for (const child of node) walk(child)
    } else if (node && typeof node === 'object') {
      for (const val of Object.values(node)) walk(val)
    }
  }

  walk(data)
  return items
}

// ─── Extract an item from a DOM block ────────────────────────────────────────

function extractItemFromBlock(el) {
  const imgEl = el.querySelector('img')
  if (!imgEl) return null
  const img = imgEl.currentSrc || imgEl.src || imgEl.dataset.src || ''
  if (!img) return null

  // Find product name — try links, headings, then any substantial text
  const nameEl =
    el.querySelector('a[href*="/product"], a[href*="/prd/"], a[href*="/shop/"], a[href*="/p/"], a[href*="/s/"], a[href*="/item/"], a[href*="/pd/"]') ||
    el.querySelector('h2, h3, h4, h5') ||
    el.querySelector('[class*="product-name"], [class*="product-title"], [class*="item-name"]') ||
    el.querySelector('a[href]')

  let name = nameEl?.textContent?.trim() || ''

  if (!name || name.length < 4) {
    const textEls = el.querySelectorAll('span, p, div, a, strong, b, td')
    for (const te of textEls) {
      if (te.children.length > 3) continue
      const t = te.textContent?.trim() || ''
      if (t.length < 5) continue
      if (/^[\$£€¥₹]/.test(t)) continue
      if (/^(style|color|size|qty|quantity|edit|remove|save)/i.test(t)) continue
      if (/^\d+$/.test(t)) continue
      name = t
      break
    }
  }

  name = name.replace(/^(Price|Name|Image)\s*/gi, '').trim()
  if (!name || name.length < 4) return null
  if (NAME_BLOCKLIST.test(name)) return null

  let price = ''
  const priceEl = el.querySelector('[class*="price"]')
  if (priceEl) {
    const match = priceEl.textContent.match(PRICE_RE)
    if (match) price = match[0]
  }
  if (!price) {
    const match = el.textContent.match(PRICE_RE)
    if (match) price = match[0]
  }

  const link =
    el.querySelector('a[href*="/product"], a[href*="/prd/"], a[href*="/shop/"], a[href*="/p/"], a[href*="/s/"], a[href*="/item/"], a[href*="/pd/"]')?.href ||
    el.querySelector('a[href]')?.href || ''

  return { name, price, imageUrl: img, url: link }
}

// ─── Communication ───────────────────────────────────────────────────────────

function sendCartUpdate(items, retailerName, { isFullCart = false } = {}) {
  chrome.runtime.sendMessage({
    type: 'CART_ITEMS_FOUND',
    retailer: retailerName,
    items,
    isFullCart,
    url: window.location.href,
    timestamp: Date.now(),
  })
}

// ─── Cart page: parse and watch for changes ──────────────────────────────────

function watchCartPage(retailerName) {
  async function parse() {
    if (!isCartPage()) {
      if (cartMutationObserver) { cartMutationObserver.disconnect(); cartMutationObserver = null }
      return
    }

    // Check if the page explicitly says the cart is empty
    const bodyText = document.body.textContent || ''
    if (/your (bag|cart|basket) is empty/i.test(bodyText)) {
      sendCartUpdate([], retailerName, { isFullCart: true })
      return
    }

    // Try Shopify /cart.js first (most reliable)
    if (isShopify()) {
      const shopifyItems = await parseShopifyCart()
      if (shopifyItems.length > 0) {
        sendCartUpdate(shopifyItems.map(i => ({ ...i, retailer: retailerName })), retailerName, { isFullCart: true })
        return
      }
    }

    // Fall back to DOM parsing
    const items = parseCartPage().map(i => ({ ...i, retailer: retailerName }))
    // Always send update on cart pages (even empty) to clear stale items
    sendCartUpdate(items, retailerName, { isFullCart: true })
  }

  parse()
  let debounce = null
  cartMutationObserver = new MutationObserver(() => {
    clearTimeout(debounce)
    debounce = setTimeout(parse, 600)
  })
  cartMutationObserver.observe(document.body, { childList: true, subtree: true })
}

// ─── Product page: detect add-to-cart with flyout/API/fallback ───────────────

function watchProductPage(retailerName) {
  // Listen for fetch-intercepted cart API responses
  document.addEventListener('__the_panel_cart__', (e) => {
    try {
      const { data } = JSON.parse(e.detail)
      const items = extractItemsFromApiResponse(data)
      if (items.length > 0) {
        sendCartUpdate(
          items.map(i => ({ ...i, retailer: retailerName })),
          retailerName,
          { isFullCart: false }
        )
      }
    } catch (e) {}
  })

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, [type="submit"], [role="button"]')
    if (!btn || !isAddToCartButton(btn)) return

    let resolved = false

    // Method 1: Watch for mini-cart / flyout / modal appearing in DOM
    const observer = new MutationObserver((mutations) => {
      if (resolved) return

      // Check for known mini-cart selectors
      let flyout = document.querySelector(MINI_CART_SELECTORS)
      if (flyout && isVisible(flyout)) {
        tryParseFlyout(flyout)
        return
      }

      // Also check for any newly added overlay/modal that contains product info
      for (const mut of mutations) {
        for (const node of mut.addedNodes) {
          if (node.nodeType !== 1) continue
          // Check if this new node or its children contain a price + image (likely a cart modal)
          const text = node.textContent || ''
          if (PRICE_RE.test(text) && node.querySelector?.('img') && isVisible(node)) {
            tryParseFlyout(node)
            return
          }
        }
      }
    })

    function tryParseFlyout(el) {
      setTimeout(() => {
        if (resolved) return
        const items = parseMiniCart(el)
        if (items.length > 0) {
          resolved = true
          observer.disconnect()
          sendCartUpdate(
            items.map(i => ({ ...i, retailer: retailerName })),
            retailerName,
            { isFullCart: false }
          )
        }
      }, 300)
    }

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })

    // Method 2: Fallback — parse the product page after 3s if nothing else fired
    setTimeout(() => {
      if (resolved) return
      resolved = true
      observer.disconnect()
      const item = parseProductPage()
      if (item) {
        sendCartUpdate([{ ...item, retailer: retailerName }], retailerName, { isFullCart: false })
      }
    }, 3000)
  }, true)
}

// ─── Init ────────────────────────────────────────────────────────────────────

let cartMutationObserver = null

function init(retailer) {
  activeRetailer = retailer

  function run() {
    if (cartMutationObserver) {
      cartMutationObserver.disconnect()
      cartMutationObserver = null
    }

    if (isCartPage()) {
      watchCartPage(retailer.name)
    } else {
      watchProductPage(retailer.name)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run)
  } else {
    run()
  }

  // Watch for SPA navigation — re-run when URL path changes
  let lastPath = window.location.pathname
  const checkNav = () => {
    if (window.location.pathname !== lastPath) {
      const wasCart = CART_PATH_PATTERNS.some(p => lastPath.toLowerCase().includes(p))
      const nowCart = isCartPage()
      lastPath = window.location.pathname
      if (wasCart !== nowCart) {
        run()
      }
    }
  }

  const origPush = history.pushState
  history.pushState = function () {
    origPush.apply(this, arguments)
    checkNav()
  }
  const origReplace = history.replaceState
  history.replaceState = function () {
    origReplace.apply(this, arguments)
    checkNav()
  }
  window.addEventListener('popstate', checkNav)
}

// ─── Start ───────────────────────────────────────────────────────────────────

const retailer = getRetailer(window.location.hostname)
console.log('[The Panel] Content script start —', window.location.hostname, 'retailer:', retailer?.name, 'isShopify:', isShopify())
if (retailer) {
  init(retailer)
} else {
  // Try Shopify — /cart.js first, then DOM parsing fallback
  console.log('[The Panel] Not a known retailer, trying Shopify detection')
  tryShopifyAuto()
}

async function tryShopifyAuto() {
  try {
    const res = await fetch('/cart.js', { credentials: 'same-origin' })
    console.log('[The Panel] /cart.js response:', res.status)
    if (!res.ok) {
      console.log('[The Panel] /cart.js not available, using DOM parsing')
      initShopifyDOM()
      return
    }
    const data = await res.json()
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      console.log('[The Panel] /cart.js has', data.items.length, 'items, using API')
      initShopify()
    } else {
      console.log('[The Panel] /cart.js empty or invalid, using DOM parsing')
      initShopifyDOM()
    }
  } catch (e) {
    console.log('[The Panel] /cart.js fetch error, using DOM parsing')
    initShopifyDOM()
  }
}

// ─── Shopify /cart.js init (standard Shopify stores) ─────────────────────

function initShopify() {
  const hostname = window.location.hostname.replace('www.', '')
  const name = hostname.split('.')[0]
  const prettyName = name.charAt(0).toUpperCase() + name.slice(1)

  activeRetailer = { name: prettyName, matches: () => true }

  async function syncShopifyCart() {
    const items = await parseShopifyCart()
    if (items.length > 0) {
      sendCartUpdate(
        items.map(i => ({ ...i, retailer: prettyName })),
        prettyName,
        { isFullCart: true }
      )
    }
  }

  syncShopifyCart()

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, [type="submit"], [role="button"]')
    if (!btn || !isAddToCartButton(btn)) return
    setTimeout(syncShopifyCart, 1500)
    setTimeout(syncShopifyCart, 3000)
  }, true)
}

// ─── Shopify DOM init (headless Shopify stores where /cart.js is 404) ────

function initShopifyDOM() {
  console.log('[The Panel] initShopifyDOM running')
  const hostname = window.location.hostname.replace('www.', '')
  const name = hostname.split('.')[0]
  const prettyName = name.charAt(0).toUpperCase() + name.slice(1)

  activeRetailer = { name: prettyName, matches: () => true }

  function parseCartDrawer() {
    const items = []
    const seen = new Set()

    // Find all product links in the page (Shopify uses /products/ URLs)
    const productLinks = document.querySelectorAll('a[href*="/products/"]')
    for (const link of productLinks) {
      // Skip links outside cart-like containers
      const container = link.closest('aside, [class*="cart"], [class*="drawer"], [role="dialog"]')
      if (!container) continue

      // Get product name from aria-label, link text, or nearby text
      let itemName = ''
      const ariaLabel = link.getAttribute('aria-label') || ''
      if (ariaLabel.startsWith('View ')) {
        itemName = ariaLabel.slice(5)
      } else {
        itemName = link.textContent?.trim() || ''
      }

      if (!itemName || itemName.length < 3 || seen.has(itemName)) continue
      if (NAME_BLOCKLIST.test(itemName)) continue

      // Walk up to find the item row (usually an <li> or a grid container)
      let row = link.closest('li, [class*="item"], [class*="grid"]')
      if (!row) row = link.parentElement?.parentElement

      // Get image
      const img = (link.querySelector('img') || row?.querySelector('img'))
      const imgSrc = img ? (img.currentSrc || img.src || img.dataset.src || '') : ''

      // Get price from the row
      let price = ''
      if (row) {
        const priceMatch = row.textContent.match(PRICE_RE)
        if (priceMatch) price = priceMatch[0]
      }

      // Get product URL
      const url = link.href || ''

      seen.add(itemName)
      items.push({ name: itemName, price, imageUrl: imgSrc, url })
    }

    return items
  }

  function syncDrawer() {
    const items = parseCartDrawer()
    console.log('[The Panel] syncDrawer found', items.length, 'items')
    if (items.length > 0) {
      sendCartUpdate(
        items.map(i => ({ ...i, retailer: prettyName })),
        prettyName,
        { isFullCart: true }
      )
    }
  }

  // Watch for cart drawer appearing/changing
  let debounce = null
  const observer = new MutationObserver(() => {
    // Only parse if there's a visible cart-like container
    const drawer = document.querySelector('aside, [class*="cart-drawer"], [class*="CartDrawer"], [role="dialog"]')
    if (drawer && isVisible(drawer)) {
      clearTimeout(debounce)
      debounce = setTimeout(syncDrawer, 500)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })

  // Also sync on add-to-cart clicks
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, [type="submit"], [role="button"]')
    if (!btn || !isAddToCartButton(btn)) return
    setTimeout(syncDrawer, 1500)
    setTimeout(syncDrawer, 3000)
  }, true)

  // Try an initial parse in case the drawer is already open
  syncDrawer()
}
