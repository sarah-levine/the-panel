# The Panel

Shop with your people. Get your friends' opinions before you buy.

## Setup

```bash
# Install dependencies
npm install

# Build (watch mode for development)
npm run dev

# Production build
npm run build
```

## Load in Chrome

1. Run `npm run build` — this creates the `dist/` folder
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `the-panel/` folder (the root, not `dist/`)
6. The Panel icon will appear in your toolbar
7. Pin it for easy access

## How it works

| File | What it does |
|------|-------------|
| `manifest.json` | Declares permissions, content scripts, sidebar |
| `src/background/service-worker.js` | Opens sidebar on icon click, receives cart data, manages storage |
| `src/content/index.js` | Injected on retail pages, reads cart DOM, sends items to background |
| `src/content/parsers.js` | Retailer-specific DOM selectors — update these when sites change |
| `src/sidebar/App.jsx` | Main sidebar UI — tabs, header, notifications |
| `src/sidebar/components/` | MyCart, FriendsFeed, ItemCard, Notifications |

## Adding a new retailer

1. Add the domain to `host_permissions` in `manifest.json`
2. Add the domain to `content_scripts.matches` in `manifest.json`
3. Add a retailer case to `getRetailer()` in `src/content/index.js`
4. Add a parser to `src/content/parsers.js`
5. Rebuild

## Known limitations (v0.1)

- Cart parsers are best-effort — retailer DOM changes will break them
- Social features (friends, reactions, comments) use placeholder data — backend not yet built
- No user accounts yet — everything is local storage only
- Prices shown to friends toggle not yet wired up

## Next steps

- [ ] Wire up real cart data to sidebar (replace placeholders)
- [ ] Build user account + auth system
- [ ] Build social backend (friends graph, reactions, comments)
- [ ] Add item detail / comment thread screen
- [ ] Add invite friends flow
- [ ] Add onboarding
