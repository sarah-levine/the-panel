const API_URL = 'http://localhost:3001'

export async function apiFetch(path, options = {}) {
  const token = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, r => resolve(r?.token))
  })

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }

  return res.json()
}
