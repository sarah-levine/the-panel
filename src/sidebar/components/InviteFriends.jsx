import { useState, useEffect } from 'react'
import { apiFetch } from '../hooks/useApi'

export default function InviteFriends({ onClose }) {
  const [inviteCode, setInviteCode] = useState(null)
  const [enterCode, setEnterCode] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    apiFetch('/friends/invite', { method: 'POST' })
      .then(data => setInviteCode(data.inviteCode))
      .catch(() => {})
  }, [])

  async function copyCode() {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {}
  }

  async function acceptInvite() {
    if (!codeInput.trim()) return
    setError(null)
    try {
      const result = await apiFetch('/friends/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: codeInput.trim() }),
      })
      setSuccess(`You're now friends with ${result.friend.displayName}!`)
      setCodeInput('')
    } catch (e) {
      setError(e.message || 'Invalid invite code')
    }
  }

  return (
    <div className="absolute inset-0 z-10 bg-panel-bg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border bg-panel-surface">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-panel-muted hover:text-panel-text transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className="text-[14px] font-medium text-panel-text">Invite Friends</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">

        {/* Share your code */}
        <div className="mb-8">
          <p className="text-[13px] text-panel-text font-medium mb-2">Your invite code</p>
          <p className="text-[12px] text-panel-muted mb-3">Share this code with friends so they can add you on The Panel.</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-panel-surface border border-panel-border rounded-lg px-3 py-2.5 text-[14px] text-panel-text font-mono tracking-wider">
              {inviteCode || '...'}
            </div>
            <button
              onClick={copyCode}
              className="bg-panel-text text-panel-bg rounded-full px-4 py-2.5 text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-panel-border" />
          <span className="text-[11px] text-panel-muted">or</span>
          <div className="flex-1 h-px bg-panel-border" />
        </div>

        {/* Enter a friend's code */}
        <div>
          <p className="text-[13px] text-panel-text font-medium mb-2">Have an invite code?</p>
          <p className="text-[12px] text-panel-muted mb-3">Enter a friend's code to connect with them.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && acceptInvite()}
              placeholder="Enter code..."
              className="flex-1 bg-panel-surface border border-panel-border rounded-lg px-3 py-2.5 text-[14px] text-panel-text outline-none focus:border-panel-muted placeholder:text-panel-muted"
            />
            <button
              onClick={acceptInvite}
              className="bg-panel-accent text-panel-text rounded-full px-4 py-2.5 text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              Add
            </button>
          </div>

          {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
          {success && <p className="text-[12px] text-green-600 mt-2">{success}</p>}
        </div>
      </div>
    </div>
  )
}
