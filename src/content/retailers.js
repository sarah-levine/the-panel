// Retailer config — hostname matching only.
// All parsing logic is generic and lives in index.js.

export const RETAILERS = [
  { name: 'ASOS', matches: (h) => h.includes('asos') },
  { name: 'Zara', matches: (h) => h.includes('zara') },
  { name: 'Nordstrom', matches: (h) => h.includes('nordstrom') },
  { name: 'Revolve', matches: (h) => h.includes('revolve') },
  { name: 'Net-a-Porter', matches: (h) => h.includes('net-a-porter') },
  { name: 'H&M', matches: (h) => h.includes('hm.com') },
  { name: 'Madewell', matches: (h) => h.includes('madewell') },
  { name: 'Free People', matches: (h) => h.includes('freepeople') },
  { name: '& Other Stories', matches: (h) => h.includes('stories.com') },
]

export function getRetailer(hostname) {
  return RETAILERS.find(r => r.matches(hostname)) || null
}
