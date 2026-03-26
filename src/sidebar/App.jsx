import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import AuthScreen from './components/AuthScreen'
import MyCart from './components/MyCart'
import FriendsFeed from './components/FriendsFeed'
import Notifications from './components/Notifications'

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, isLoading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('cart')
  const [cartItems, setCartItems] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  // Load cart items from chrome.storage on mount and listen for changes
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) return

    chrome.storage.local.get(['cartItems', 'notifications'], (result) => {
      if (result.cartItems) setCartItems(result.cartItems)
      if (result.notifications) {
        setNotifications(result.notifications)
        setUnreadCount(result.notifications.filter(n => !n.read).length)
      }
    })

    function onMessage(message) {
      if (message.type === 'CART_UPDATED') {
        setCartItems(message.items)
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)

    function onStorageChanged(changes) {
      if (changes.cartItems) {
        setCartItems(changes.cartItems.newValue || [])
      }
      if (changes.notifications) {
        const updated = changes.notifications.newValue || []
        setNotifications(updated)
        setUnreadCount(updated.filter(n => !n.read).length)
      }
    }
    chrome.storage.onChanged.addListener(onStorageChanged)

    return () => {
      chrome.runtime.onMessage.removeListener(onMessage)
      chrome.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-panel-bg">
        <div className="w-8 h-8 rounded-full bg-panel-accent animate-pulse" />
      </div>
    )
  }

  // Not signed in
  if (!user) {
    return <AuthScreen />
  }

  // User initials for avatar
  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <div className="flex flex-col h-screen bg-panel-bg">

      {/* Header */}
      <div className="border-b border-panel-border bg-panel-surface">
        <div className="flex items-center justify-end px-4 py-2 gap-3">
          {/* Notification bell */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-7 h-7 flex items-center justify-center rounded-full hover:bg-panel-bg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-panel-muted">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-panel-accent text-panel-text text-[9px] font-medium rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {/* Avatar */}
          <button
            onClick={signOut}
            title="Sign out"
            className="w-7 h-7 rounded-full bg-panel-accent/20 flex items-center justify-center text-[10px] font-medium text-panel-text overflow-hidden"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex-1 text-center text-[13px] py-2 border-b-2 transition-colors ${
              activeTab === 'cart'
                ? 'border-panel-text text-panel-text font-medium'
                : 'border-transparent text-panel-muted hover:text-panel-text'
            }`}
          >
            My cart
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 text-center text-[13px] py-2 border-b-2 transition-colors ${
              activeTab === 'friends'
                ? 'border-panel-text text-panel-text font-medium'
                : 'border-transparent text-panel-muted hover:text-panel-text'
            }`}
          >
            Friends
            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-panel-accent inline-block align-middle" />
          </button>
        </div>
      </div>

      {/* Notification panel overlay */}
      {showNotifications && (
        <Notifications
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={() => {
            const updated = notifications.map(n => ({ ...n, read: true }))
            setNotifications(updated)
            setUnreadCount(0)
          }}
        />
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'cart' && <MyCart items={cartItems} />}
        {activeTab === 'friends' && <FriendsFeed />}
      </div>

    </div>
  )
}
