import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check auth state on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' }, (response) => {
      if (response?.user) setUser(response.user)
      setIsLoading(false)
    })

    // Listen for auth changes from other contexts
    function onStorageChanged(changes) {
      if (changes.user) {
        setUser(changes.user.newValue || null)
      }
    }
    chrome.storage.session.onChanged.addListener(onStorageChanged)
    return () => chrome.storage.session.onChanged.removeListener(onStorageChanged)
  }, [])

  async function signIn() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'SIGN_IN' }, (response) => {
        if (response?.ok) {
          setUser(response.user)
          resolve(response.user)
        } else {
          reject(new Error(response?.error || 'Sign in failed'))
        }
      })
    })
  }

  async function signOut() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
        setUser(null)
        resolve()
      })
    })
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
