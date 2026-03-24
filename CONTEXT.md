# The Panel — Project Context

## What is this?

The Panel is a Chrome browser extension (Manifest V3) that lets shoppers see all their fashion cart items in one organised sidebar, and share them with a close friends network for opinions before buying.

The core insight: people already share product links in WhatsApp and iMessage asking "should I buy this?" — The Panel gives that behaviour a dedicated home.

---

## Product decisions

**Name:** The Panel — named because everyone has a trusted panel of friends whose shopping opinions they value.

**Target user:** Social shoppers (22–40) who browse multiple fashion sites and want peer validation before buying.

**Core features (v1.0):**
- Read cart items from supported fashion retailers automatically
- Organise items by category (Tops, Dresses, Shoes, etc.)
- Show price per item with optional user notes
- Closed, invite-only friends network (invite link only, no open search)
- Social feed — friends can see each other's carts
- Reactions: upvote/downvote, emoji reactions, threaded comments
- Save a friend's item to your own cart view
- In-extension notifications (no email/push in v1.0)
- Per-item privacy toggle (mark items private so friends can't see)
- "Shop this" button — opens item on retailer site

**Explicit non-goals (v1.0):**
- No running total / grand total across carts
- No grocery or non-fashion retailers
- No direct checkout within extension
- No public profiles or open discovery
- No mobile app
- No push notifications

**Supported retailers:** Any fashion site meeting inclusion criteria (stable cart page, exposes name/price/image, no aggressive anti-scraping). Specific site list lives in `src/content/retailers.js`, not hardcoded in the PRD.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome MV3, content scripts, service worker |
| Sidebar UI | React 18 + Tailwind CSS |
| Build | Vite 5 + postbuild.mjs path-fix script |
| Cart parsing | DOM parsing + fetch intercept per retailer |
| Storage | chrome.storage.local (local-only, no backend yet) |
| Icons | Custom yellow circle PNGs |

---

## File structure

```
the-panel/
├── manifest.json                  # MV3 config — permissions, content scripts, side panel
├── icons/                         # icon16.png, icon48.png, icon128.png (yellow circles)
├── postbuild.mjs                  # Fixes Vite asset paths after build (required)
├── vite.config.js                 # Multi-entry build: sidebar + content + service-worker
├── src/
│   ├── content/
│   │   ├── retailers.js           # ← SINGLE SOURCE OF TRUTH for all retailer logic
│   │   └── index.js               # Generic content script orchestration
│   ├── background/
│   │   └── service-worker.js      # Opens sidebar, receives cart data, manages storage
│   └── sidebar/
│       ├── App.jsx                # Main sidebar shell — tabs, header, notifications
│       ├── index.jsx              # React root
│       ├── index.css              # Tailwind entry
│       ├── index.html             # Sidebar entry point
│       └── components/
│           ├── MyCart.jsx         # My cart tab — items grouped by category
│           ├── FriendsFeed.jsx    # Friends tab — social feed
│           ├── ItemCard.jsx       # Individual item card with reactions, notes, privacy
│           └── Notifications.jsx  # Notification panel overlay
└── dist/                          # Built output (gitignored — run npm run build)
```

---

## How the build works

```bash
npm install
npm run build   # runs vite build + postbuild.mjs
```

**Important:** `postbuild.mjs` must run after every build. It fixes a Vite quirk where the sidebar HTML is output to `dist/src/sidebar/index.html` but references assets with absolute paths (`/sidebar/...`) that don't work in Chrome extensions. The script copies assets next to the HTML and rewrites paths to relative (`./sidebar-xxx.js`).

The manifest points to `dist/src/sidebar/index.html` for the side panel.

After building, load in Chrome:
- `chrome://extensions` → Developer mode → Load unpacked → select `the-panel/` folder

---

## How cart reading works

### retailers.js — the only file you touch to add/fix a retailer

Each retailer is a config object:

```js
{
  name: 'ASOS',
  matches: (hostname) => hostname.includes('asos'),
  isCartPage: (pathname) => pathname.includes('/bag'),
  cartApiPatterns: ['/cart', '/bag', 'shoppingbag'],
  addToCartText: ['add to bag'],
  miniCartSelector: '[class*="bag-item"], [data-testid="bag-item-image"]',
  parseResponseItems: (data) => data?.bag?.items || data?.items || [],
  parseItem: (item) => ({ name, price, imageUrl, url }),
  parseDom: () => { /* reads from bag page DOM */ },
  parseMiniCart: () => { /* reads from mini-bag flyout on product pages */ },
}
```

### index.js — generic orchestration, no retailer-specific strings

- **Bag page:** `MutationObserver` watches for DOM changes (removals, qty changes), debounced 600ms, calls `parseDom`
- **Product page:** Wraps `window.fetch` to intercept cart API calls, parses response via `parseResponseItems` + `parseItem`. Falls back to watching for mini-cart flyout via `miniCartSelector`, then calls `parseMiniCart`

### ASOS-specific DOM selectors (confirmed working)

```js
// Bag page items
'ul.bag-groups li.bag-group-holder .bag-item'

// Item name
'[class*="product-title"], [class*="item-name"], h3, h4'

// Item price  
'[class*="price"]'

// Mini-cart container (product page flyout)
'[class*="bag-item-container"]'
```

---

## Current state

### Working ✅
- Extension loads in Chrome with yellow icon
- Sidebar renders with My Cart + Friends tabs
- ASOS bag page reading — real items, prices, images
- Category auto-classification (Tops, Dresses, Shoes, etc.)
- Item removal detection — Panel updates when item removed from bag
- Placeholder social data renders correctly in sidebar UI

### In progress / needs work 🔧
- `parseMiniCart` on ASOS product pages — mini-bag flyout parsing after add-to-bag may need selector tuning
- Real cart data not yet wired to sidebar — sidebar still shows placeholder items from `MyCart.jsx` and `FriendsFeed.jsx`
- The background service worker receives real cart data but the sidebar reads from `chrome.storage.local` — the connection between storage and sidebar state needs to be wired up in `App.jsx`

### Not started yet ❌
- User accounts + auth
- Social backend (friends graph, reactions, comments API)
- Invite friends flow (working UI mockup exists)
- Onboarding flow (working UI mockup exists)
- Notifications wired to real data
- Other retailers beyond ASOS (parsers exist but unverified)

---

## UI mockups completed

All screens were designed and are available as interactive HTML mockups (built in this conversation):
1. Main sidebar — My Cart + Friends feed
2. Item detail + comment thread (with edit/delete)
3. Notifications panel
4. Invite friends + accept invite screens
5. Onboarding 5-step flow

---

## PRD

Full PRD (The Panel v1.1) covers: overview, problem statement, goals, personas, all features, user stories, supported site criteria, technical architecture, data model, success metrics, open questions, and 16-week milestone timeline. Available as `ThePanel_PRD_v1.1.docx`.

---

## Key open questions

- How to wire `chrome.storage.local` cart data into the React sidebar state
- `parseMiniCart` selector accuracy for ASOS product page flyout
- When to start the backend — user accounts needed before social features work
- Whether to support Firefox at launch or Chrome-only

---

## Next logical steps

1. Wire real cart data from `chrome.storage.local` into `MyCart.jsx` (replace placeholder items)
2. Debug and verify `parseMiniCart` on ASOS product pages
3. Verify and tune parsers for other retailers (Zara, Nordstrom, etc.)
4. Design and build user account system
5. Build social backend (Node.js + PostgreSQL recommended)
