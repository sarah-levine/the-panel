import { useState, useEffect } from 'react'
import MyCart from './components/MyCart'
import FriendsFeed from './components/FriendsFeed'
import Notifications from './components/Notifications'

export default function App() {
  const [activeTab, setActiveTab] = useState('cart')
  const [cartItems, setCartItems] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  // Load cart items from chrome.storage on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['cartItems', 'notifications'], (result) => {
        if (result.cartItems) setCartItems(result.cartItems)
        if (result.notifications) {
          setNotifications(result.notifications)
          setUnreadCount(result.notifications.filter(n => !n.read).length)
        }
      })

      // Listen for updates from content script
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'CART_UPDATED') {
          setCartItems(message.items)
        }
      })
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[15px] font-medium tracking-tight text-[#1A1A2E]">
            The Panel
          </span>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#D4537E] text-white text-[9px] font-medium rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[10px] font-medium text-[#085041]">
              JL
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex-1 text-center text-[13px] py-2 border-b-2 transition-colors ${
              activeTab === 'cart'
                ? 'border-[#1A1A2E] text-[#1A1A2E] font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            My cart
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 text-center text-[13px] py-2 border-b-2 transition-colors ${
              activeTab === 'friends'
                ? 'border-[#1A1A2E] text-[#1A1A2E] font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Friends
            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[#D4537E] inline-block align-middle" />
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
