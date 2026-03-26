// Retailer config — hostname matching + optional per-site selectors for cart parsing.
// The generic parser in index.js is the fallback; per-site configs improve accuracy.

export const RETAILERS = [
  {
    name: 'ASOS',
    matches: (h) => h.includes('asos'),
    cartPath: '/bag',
    cartItemSelector: '.bag-item, [class*="bagItem"]',
    nameSelector: 'a[href*="/prd/"], [class*="product-title"], [class*="item-name"], h3, h4',
    priceSelector: '[class*="price"]',
  },
  {
    name: 'Zara',
    matches: (h) => h.includes('zara'),
    cartPath: '/cart',
    cartItemSelector: '[class*="product-cart"], [class*="cart-item"], [data-testid*="cart-product"]',
    nameSelector: '[class*="product-name"], [class*="description"], a[href*="/p/"]',
    priceSelector: '[class*="price"]',
  },
  {
    name: 'Nordstrom',
    matches: (h) => h.includes('nordstrom'),
    cartPath: '/shopping-bag',
    cartItemSelector: '[class*="cart-item"], [data-element="cart-item"]',
    nameSelector: '[class*="product-name"], [class*="item-name"], a[href*="/s/"]',
    priceSelector: '[class*="price"]',
  },
  {
    name: 'Revolve',
    matches: (h) => h.includes('revolve'),
    cartPath: '/checkout',
    cartItemSelector: '[class*="cart-product"], [class*="product-info"]',
    nameSelector: '[class*="name"], [class*="title"]',
    priceSelector: '[class*="price"]',
  },
  {
    name: 'Net-a-Porter',
    matches: (h) => h.includes('net-a-porter'),
    cartItemSelector: '[class*="cart-item"], [class*="bag-item"]',
    nameSelector: '[class*="product-name"], [class*="designer-name"]',
    priceSelector: '[class*="price"]',
  },
  {
    name: 'H&M',
    matches: (h) => h.includes('hm.com'),
    cartPath: '/bag',
    cartItemSelector: '[class*="product-item"], [class*="cart-item"]',
    nameSelector: '[class*="product-name"], [class*="item-heading"]',
    priceSelector: '[class*="price"]',
  },
  {
    name: 'Madewell',
    matches: (h) => h.includes('madewell'),
    cartPath: '/bag',
    cartItemSelector: '[class*="cart-product"], [class*="bag-item"]',
    nameSelector: '[class*="product-name"]',
    priceSelector: '[class*="product-price"], [class*="price"]',
  },
  {
    name: 'Free People',
    matches: (h) => h.includes('freepeople'),
    cartPath: '/cart',
    cartItemSelector: '.cart-item, [class*="cartItem"], [class*="cart_item"]',
    nameSelector: 'a[href*="/shop/"]',
    priceSelector: '[class*="price"]',
  },
  {
    name: '& Other Stories',
    matches: (h) => h.includes('stories.com'),
    cartItemSelector: '[class*="cart-item"], [class*="product-item"]',
    nameSelector: '[class*="product-name"], [class*="title"]',
    priceSelector: '[class*="price"]',
  },
]

// Detect Shopify stores via DOM (content scripts run in isolated world, can't see window.Shopify)
export function isShopify() {
  return !!(
    document.querySelector('script[src*="cdn.shopify.com"]') ||
    document.querySelector('link[href*="cdn.shopify.com"]') ||
    document.querySelector('meta[name="shopify-checkout-api-token"]') ||
    document.querySelector('#shopify-features') ||
    document.querySelector('[data-shopify]')
  )
}

export function getRetailer(hostname) {
  return RETAILERS.find(r => r.matches(hostname)) || null
}
