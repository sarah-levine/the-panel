// Chrome identity auth flow — runs in the service worker context

const API_URL = 'http://localhost:3001'

export async function signInWithGoogle() {
  // Get a Google access token via Chrome's identity API
  const { token: googleToken } = await chrome.identity.getAuthToken({ interactive: true })

  // Exchange it with our backend for a session JWT
  const res = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ googleAccessToken: googleToken }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Sign in failed')
  }

  const { token, user } = await res.json()

  // Store in session storage (encrypted, cleared on browser close)
  await chrome.storage.session.set({ authToken: token, user })

  return user
}

export async function getAuthState() {
  const data = await chrome.storage.session.get(['authToken', 'user'])
  if (!data.authToken || !data.user) return null
  return data.user
}

export async function getAuthToken() {
  const { authToken } = await chrome.storage.session.get('authToken')
  return authToken || null
}

export async function signOut() {
  // Clear Google's cached token
  try {
    const { token } = await chrome.identity.getAuthToken({ interactive: false })
    if (token) {
      await chrome.identity.removeCachedAuthToken({ token })
    }
  } catch (e) {
    // No cached token — that's fine
  }

  // Clear our session
  await chrome.storage.session.remove(['authToken', 'user'])
}
