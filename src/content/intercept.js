// Runs in the MAIN world — can see the page's fetch calls.
// Communicates with the content script (isolated world) via CustomEvent on the document.

// Only match URLs that are clearly cart/bag API endpoints, not general pages
const CART_PATTERNS = ['/api/cart', '/api/bag', 'shoppingbag', 'savedlists', 'addtobag', 'add-to-bag', 'bag-items', 'bagitems', 'add-item']

const origFetch = window.fetch
window.fetch = function (...args) {
  const p = origFetch.apply(this, args)
  try {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '')
    const urlLower = url.toLowerCase()
    const isCartCall = CART_PATTERNS.some(pat => urlLower.includes(pat))
    if (isCartCall) {
      p.then(res => {
        try {
          const ct = res.headers?.get('content-type') || ''
          if (ct.includes('json')) {
            res.clone().json().then(data => {
              console.log('[The Panel] Intercepted cart fetch:', url)
              document.dispatchEvent(new CustomEvent('__the_panel_cart__', {
                detail: JSON.stringify({ url, data })
              }))
            }).catch(() => {})
          }
        } catch (e) {}
      }).catch(() => {})
    }
  } catch (e) {}
  return p
}

// Also intercept XMLHttpRequest for sites that use it
const origOpen = XMLHttpRequest.prototype.open
const origSend = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._thePanelUrl = url
  return origOpen.call(this, method, url, ...rest)
}
XMLHttpRequest.prototype.send = function (...args) {
  this.addEventListener('load', function () {
    try {
      const url = this._thePanelUrl || ''
      if (CART_PATTERNS.some(p => url.toLowerCase().includes(p))) {
        console.log('[The Panel] Intercepted cart XHR:', url)
        const data = JSON.parse(this.responseText)
        document.dispatchEvent(new CustomEvent('__the_panel_cart__', {
          detail: JSON.stringify({ url, data })
        }))
      }
    } catch (e) {}
  })
  return origSend.apply(this, args)
}
