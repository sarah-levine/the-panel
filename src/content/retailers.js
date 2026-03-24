// Retailer config — single source of truth for all retailer-specific logic
// Each entry owns: hostname matching, cart page detection, and DOM parsing

export const RETAILERS = [
  {
    name: 'ASOS',
    matches: (hostname) => hostname.includes('asos'),
    isCartPage: (pathname) => pathname.includes('/bag'),
    cartApiPatterns: ['/cart', '/bag', 'shoppingbag'],
    addToCartText: ['add to bag'],
    miniCartSelector: '[class*="miniCart"], [data-auto-id="miniCart"], [class*="MiniCart"]',
    parseResponseItems: (data) => {
      return (
        data?.bag?.items ||
        data?.items ||
        data?.cart?.items ||
        data?.shoppingBag?.items ||
        []
      )
    },
    parseItem: (item) => ({
      name: item?.name || item?.productName || item?.title || '',
      price: String(item?.price?.current?.text || item?.price?.value || item?.currentPrice || ''),
      imageUrl: item?.imageUrl || item?.images?.[0]?.url || item?.image?.url || '',
      url: item?.url || item?.productUrl || '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('ul.bag-groups li.bag-group-holder .bag-item').forEach(el => {
        const name = el.querySelector('[class*="product-title"], [class*="item-name"], h3, h4')?.textContent?.trim()
        const price = el.querySelector('[class*="price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        const link = el.querySelector('a')?.href
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: link || '' })
      })
      return items
    },
  },
  {
    name: 'Zara',
    matches: (hostname) => hostname.includes('zara'),
    isCartPage: (pathname) => pathname.includes('/cart'),
    cartApiPatterns: ['/cart', '/shoppingcart'],
    addToCartText: ['add to cart', 'add'],
    miniCartSelector: '[class*="shop-cart"], [class*="cart-item"]',
    parseResponseItems: (data) => data?.cart?.items || data?.items || [],
    parseItem: (item) => ({
      name: item?.name || item?.description || '',
      price: String(item?.price || ''),
      imageUrl: item?.image || '',
      url: '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('[class*="shop-cart-item"], .cart-item').forEach(el => {
        const name = el.querySelector('[class*="description"], [class*="name"]')?.textContent?.trim()
        const price = el.querySelector('[class*="price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: '' })
      })
      return items
    },
  },
  {
    name: 'Nordstrom',
    matches: (hostname) => hostname.includes('nordstrom'),
    isCartPage: (pathname) => pathname.includes('/shopping/bag'),
    cartApiPatterns: ['/cart', '/bag'],
    addToCartText: ['add to bag', 'add to cart'],
    miniCartSelector: '[class*="cart-flyout"], [class*="mini-bag"]',
    parseResponseItems: (data) => data?.bag?.items || data?.items || [],
    parseItem: (item) => ({
      name: item?.name || item?.productName || '',
      price: String(item?.price?.display || item?.price || ''),
      imageUrl: item?.image?.url || '',
      url: item?.productUrl || '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('[class*="cart-item"], [data-element="cart-item"]').forEach(el => {
        const name = el.querySelector('[class*="product-name"], [class*="item-name"]')?.textContent?.trim()
        const price = el.querySelector('[class*="price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        const link = el.querySelector('a')?.href
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: link || '' })
      })
      return items
    },
  },
  {
    name: 'Revolve',
    matches: (hostname) => hostname.includes('revolve'),
    isCartPage: (pathname) => pathname.includes('/checkout'),
    cartApiPatterns: ['/cart', '/checkout'],
    addToCartText: ['add to cart', 'add to bag'],
    miniCartSelector: '[class*="cart-product"]',
    parseResponseItems: (data) => data?.cart?.items || data?.items || [],
    parseItem: (item) => ({
      name: item?.name || item?.title || '',
      price: String(item?.price || ''),
      imageUrl: item?.imageUrl || '',
      url: item?.url || '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('[class*="cart-product"], [class*="product-info"]').forEach(el => {
        const name = el.querySelector('[class*="name"], [class*="title"]')?.textContent?.trim()
        const price = el.querySelector('[class*="price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: '' })
      })
      return items
    },
  },
  {
    name: 'Net-a-Porter',
    matches: (hostname) => hostname.includes('net-a-porter'),
    isCartPage: (pathname) => pathname.includes('/cart'),
    cartApiPatterns: ['/cart', '/bag'],
    addToCartText: ['add to bag', 'add to cart'],
    miniCartSelector: '[class*="cart-item"], [class*="bag-item"]',
    parseResponseItems: (data) => data?.cart?.items || data?.items || [],
    parseItem: (item) => ({
      name: item?.name || item?.designerName + ' ' + item?.productName || '',
      price: String(item?.price?.value || ''),
      imageUrl: item?.imageUrl || '',
      url: item?.url || '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('[class*="cart-item"], [class*="bag-item"]').forEach(el => {
        const name = el.querySelector('[class*="product-name"], [class*="designer-name"]')?.textContent?.trim()
        const price = el.querySelector('[class*="price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: '' })
      })
      return items
    },
  },
  {
    name: 'H&M',
    matches: (hostname) => hostname.includes('hm.com'),
    isCartPage: (pathname) => pathname.includes('/bag'),
    cartApiPatterns: ['/cart', '/bag'],
    addToCartText: ['add to bag', 'add to cart'],
    miniCartSelector: '[class*="product-item"], [class*="cart-item"]',
    parseResponseItems: (data) => data?.cart?.items || data?.items || [],
    parseItem: (item) => ({
      name: item?.name || item?.title || '',
      price: String(item?.price || ''),
      imageUrl: item?.imageUrl || '',
      url: item?.url || '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('[class*="product-item"], [class*="cart-item"]').forEach(el => {
        const name = el.querySelector('[class*="product-name"], [class*="item-heading"]')?.textContent?.trim()
        const price = el.querySelector('[class*="price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: '' })
      })
      return items
    },
  },
  {
    name: 'Madewell',
    matches: (hostname) => hostname.includes('madewell'),
    isCartPage: (pathname) => pathname.includes('/shoppingBag') || pathname.includes('/bag'),
    cartApiPatterns: ['/cart', '/bag'],
    addToCartText: ['add to bag'],
    miniCartSelector: '[class*="cart-product"], [class*="bag-item"]',
    parseResponseItems: (data) => data?.cart?.items || data?.items || [],
    parseItem: (item) => ({
      name: item?.name || '',
      price: String(item?.price || ''),
      imageUrl: item?.imageUrl || '',
      url: item?.url || '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('[class*="cart-product"], [class*="bag-item"]').forEach(el => {
        const name = el.querySelector('[class*="product-name"]')?.textContent?.trim()
        const price = el.querySelector('[class*="product-price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: '' })
      })
      return items
    },
  },
  {
    name: 'Free People',
    matches: (hostname) => hostname.includes('freepeople'),
    isCartPage: (pathname) => pathname.includes('/bag'),
    cartApiPatterns: ['/cart', '/bag'],
    addToCartText: ['add to cart', 'add to bag'],
    miniCartSelector: '[class*="cart-item"]',
    parseResponseItems: (data) => data?.cart?.items || data?.items || [],
    parseItem: (item) => ({
      name: item?.name || '',
      price: String(item?.price || ''),
      imageUrl: item?.imageUrl || '',
      url: item?.url || '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('[class*="cart-item"], [class*="product-card"]').forEach(el => {
        const name = el.querySelector('[class*="product-name"]')?.textContent?.trim()
        const price = el.querySelector('[class*="price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: '' })
      })
      return items
    },
  },
  {
    name: '& Other Stories',
    matches: (hostname) => hostname.includes('stories.com'),
    isCartPage: (pathname) => pathname.includes('/cart') || pathname.includes('/bag'),
    cartApiPatterns: ['/cart', '/bag'],
    addToCartText: ['add to bag', 'add to cart'],
    miniCartSelector: '[class*="cart-item"], [class*="product-item"]',
    parseResponseItems: (data) => data?.cart?.items || data?.items || [],
    parseItem: (item) => ({
      name: item?.name || item?.title || '',
      price: String(item?.price || ''),
      imageUrl: item?.imageUrl || '',
      url: item?.url || '',
    }),
    parseDom: () => {
      const items = []
      document.querySelectorAll('[class*="cart-item"], [class*="product-item"]').forEach(el => {
        const name = el.querySelector('[class*="product-name"], [class*="title"]')?.textContent?.trim()
        const price = el.querySelector('[class*="price"]')?.textContent?.trim()
        const img = el.querySelector('img')?.src
        if (name) items.push({ name, price: price || '', imageUrl: img || '', url: '' })
      })
      return items
    },
  },
]

// Look up a retailer config by hostname
export function getRetailer(hostname) {
  return RETAILERS.find(r => r.matches(hostname)) || null
}
