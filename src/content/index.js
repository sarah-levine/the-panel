// Content script — generic cart detection for any supported retailer.
// No retailer-specific logic — all parsing is pattern-based.

import { getRetailer } from './retailers'

// ─── Cart/bag page detection ─────────────────────────────────────────────────

const CART_PATH_PATTERNS = ['/cart', '/bag', '/basket', '/shopping-bag', '/shoppingbag', '/shopping/bag']

function isCartPage() {
  const path = window.location.pathname.toLowerCase()
  return CART_PATH_PATTERNS.some(p => path.includes(p))
}

// ─── Add-to-cart button detection ────────────────────────────────────────────

const ADD_BUTTON_PATTERNS = ['add to bag', 'add to cart', 'add to basket', 'add to shopping bag']

function isAddToCartButton(btn) {
  const text = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase().trim()
  return ADD_BUTTON_PATTERNS.some(p => text.includes(p))
}

// ─── Generic cart page parser ────────────────────────────────────────────────
// Finds repeated product blocks on a cart/bag page.
// A product block = an element containing an image + a product name + a price.

function parseCartPage() {
  const items = []
  const seen = new Set()

  // Strategy: find all product images on the page, then walk up the DOM
  // to find the nearest ancestor that also contains a price and product name.
  // This works regardless of what classes or structure the retailer uses.

  const allImages = document.querySelectorAll('img')
  console.log('[The Panel] parseCartPage: found', allImages.length, 'images on page')
  let skippedTiny = 0, skippedNoBlock = 0, extracted = 0

  for (const imgEl of allImages) {
    // Skip tiny images (icons, logos) — product images are usually > 50px
    const rect = imgEl.getBoundingClientRect()
    if (rect.width > 0 && rect.width < 40 && rect.height > 0 && rect.height < 40) { skippedTiny++; continue }
    // Also skip images not yet rendered (lazy loaded, off-screen)
    // but allow zero-size images that might have data-src
    const imgSrc = imgEl.currentSrc || imgEl.src || imgEl.dataset.src || ''
    if (!imgSrc) continue

    // Walk up the DOM tree to find the nearest ancestor that:
    // 1. Contains a price (currency pattern)
    // 2. Is small enough to be a single product (not the whole page)
    let block = imgEl.parentElement
    let found = false
    for (let i = 0; i < 12 && block && block !== document.body; i++) {
      const text = block.textContent || ''
      const hasPrice = /[\$£€]\d/.test(text)
      const imgCount = block.querySelectorAll('img').length
      if (hasPrice && imgCount <= 5) {
        const item = extractItemFromBlock(block)
        if (item && !seen.has(item.name)) {
          seen.add(item.name)
          items.push(item)
          extracted++
        }
        found = true
        break
      }
      // If we've hit a block with too many images, stop — we've gone too far
      if (imgCount > 10) break
      block = block.parentElement
    }
    if (!found) skippedNoBlock++
  }

  console.log('[The Panel] parseCartPage results:', { extracted, skippedTiny, skippedNoBlock, total: items.length })
  return items
}

// ─── Generic product page parser ─────────────────────────────────────────────
// Scrapes the current product page for the main item's name, price, and image.

function parseProductPage() {
  // Product name — usually the main h1
  const name = document.querySelector('h1')?.textContent?.trim() || ''

  // Price — find text that looks like a currency amount near the product title
  let price = ''
  const priceSelectors = [
    '[class*="current-price"]', '[class*="product-price"]', '[class*="sale-price"]',
    '[class*="price"] span', '[class*="price"]', '[data-testid*="price"]',
  ]
  for (const sel of priceSelectors) {
    const el = document.querySelector(sel)
    if (el) {
      const match = el.textContent.match(/[\$£€][\d,.]+/)
      if (match) { price = match[0]; break }
    }
  }
  // Broader fallback: scan any element for a price near the h1
  if (!price) {
    const allEls = document.querySelectorAll('span, p, div')
    for (const el of allEls) {
      if (el.children.length > 2) continue // skip containers
      const match = el.textContent.match(/^[\s]*[\$£€][\d,.]+[\s]*$/)
      if (match) { price = match[0].trim(); break }
    }
  }

  // Image — main product image
  const img = document.querySelector(
    '[class*="product"] img[src*="http"], [class*="gallery"] img[src*="http"], [class*="hero"] img[src*="http"]'
  )?.src || document.querySelector('img[src*="http"]')?.src || ''

  const url = window.location.href

  if (!name) return null
  return { name, price, imageUrl: img, url }
}

// ─── Extract an item from a DOM block ────────────────────────────────────────

function extractItemFromBlock(el) {
  // Must have an image to be a product block
  const imgEl = el.querySelector('img')
  if (!imgEl) return null
  const img = imgEl.currentSrc || imgEl.src || imgEl.dataset.src || ''
  if (!img) return null

  // Find product name — try links, headings, then any substantial text
  const nameEl =
    el.querySelector('a[href*="/product"], a[href*="/prd/"], a[href*="/shop/"]') ||
    el.querySelector('h2, h3, h4, h5') ||
    el.querySelector('[class*="product-name"], [class*="product-title"], [class*="item-name"]') ||
    el.querySelector('a[href]')

  let name = nameEl?.textContent?.trim() || ''

  // Fallback: if no name found via selectors, find the first text element
  // that looks like a product name (not a price, not a label)
  if (!name || name.length < 4) {
    const textEls = el.querySelectorAll('span, p, div, a, strong, b, td')
    for (const te of textEls) {
      // Only check leaf-ish elements (not big containers)
      if (te.children.length > 3) continue
      const t = te.textContent?.trim() || ''
      // Skip prices, labels, short text
      if (t.length < 5) continue
      if (/^[\$£€]/.test(t)) continue
      if (/^(style|color|size|qty|quantity|edit|remove|save)/i.test(t)) continue
      if (/^\d+$/.test(t)) continue
      name = t
      break
    }
  }

  // Clean up: remove hidden label text patterns
  name = name.replace(/^(Price|Name|Image)\s*/gi, '').trim()
  if (!name || name.length < 4) return null

  // Skip non-product text (order summary UI, promo fields, checkout elements)
  if (/^(promo\s*code|coupon|gift\s*card|order\s*summary|sub\s*total|shipping|estimated\s*tax|proceed|checkout|pay\s*with|total$)/i.test(name)) return null

  // Find price — look for currency pattern
  let price = ''
  const priceEl = el.querySelector('[class*="price"]')
  if (priceEl) {
    const match = priceEl.textContent.match(/[\$£€][\d,.]+/)
    if (match) price = match[0]
  }
  if (!price) {
    // Scan direct text nodes for currency
    const match = el.textContent.match(/[\$£€][\d,.]+/)
    if (match) price = match[0]
  }

  // Find product link
  const link =
    el.querySelector('a[href*="/product"], a[href*="/prd/"], a[href*="/shop/"]')?.href ||
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
  function parse() {
    const items = parseCartPage().map(i => ({ ...i, retailer: retailerName }))
    if (items.length > 0) {
      sendCartUpdate(items, retailerName, { isFullCart: true })
    }
  }

  parse()
  let debounce = null
  cartMutationObserver = new MutationObserver(() => {
    clearTimeout(debounce)
    debounce = setTimeout(parse, 600)
  })
  cartMutationObserver.observe(document.body, { childList: true, subtree: true })
}

// ─── Product page: detect add-to-cart ────────────────────────────────────────

function watchProductPage(retailerName) {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, [type="submit"], [role="button"]')
    if (!btn || !isAddToCartButton(btn)) return
    setTimeout(() => {
      const item = parseProductPage()
      if (item) {
        sendCartUpdate([{ ...item, retailer: retailerName }], retailerName, { isFullCart: false })
      }
    }, 500)
  }, true)
}

// ─── Init ────────────────────────────────────────────────────────────────────

let currentMode = null // 'cart' or 'product'
let cartMutationObserver = null

function init(retailer) {
  function run() {
    // Disconnect previous cart observer if switching modes
    if (cartMutationObserver) {
      cartMutationObserver.disconnect()
      cartMutationObserver = null
    }

    console.log('[The Panel] init run —', retailer.name, '| path:', window.location.pathname, '| isCartPage:', isCartPage())
    if (isCartPage()) {
      currentMode = 'cart'
      watchCartPage(retailer.name)
    } else {
      currentMode = 'product'
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
if (retailer) init(retailer)
