'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import ReviewActions from '@/app/components/ReviewActions'
import type { SavedExplanation } from '@/lib/explanations'
import { clearDraft, explanationDraftKey, readDraft, writeDraft } from '@/lib/explanation-drafts'

const DRAFT_EVENT = 'dsa-explanation-draft-changed'
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(DRAFT_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(DRAFT_EVENT, callback)
  }
}

export default function ExplainForm({ reviewId, userId, initialSaved }: {
  reviewId: number; userId: string; initialSaved?: SavedExplanation
}) {
  const draftKey = explanationDraftKey(userId, reviewId)
  const memoryDraft = useRef('')
  const volatileDraft = useRef(false)
  const readSnapshot = useCallback(() => {
    if (volatileDraft.current) return memoryDraft.current
    try { return readDraft(window.localStorage, draftKey) }
    catch { return memoryDraft.current }
  }, [draftKey])
  const text = useSyncExternalStore(subscribe, readSnapshot, () => '')
  const [storageFailed, setStorageFailed] = useState(false)
  const [saved, setSaved] = useState<SavedExplanation | null>(initialSaved ?? null)
  const [saving, setSaving] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)

  useEffect(() => {
    if (saved) {
      memoryDraft.current = ''
      try { clearDraft(window.localStorage, draftKey) } catch { /* Saved server copy remains available. */ }
      window.dispatchEvent(new Event(DRAFT_EVENT))
    }
  }, [saved, draftKey])

  function changeText(value: string) {
    memoryDraft.current = value
    try {
      writeDraft(window.localStorage, draftKey, value)
      volatileDraft.current = false
      setStorageFailed(false)
    } catch { volatileDraft.current = true; setStorageFailed(true) }
    window.dispatchEvent(new Event(DRAFT_EVENT))
  }

  async function feedback() {
    setEvaluating(true)
    try {
      const res = await fetch('/api/explanation-feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId }), signal: AbortSignal.timeout(30000),
      })
      const data = await res.json()
      if (!res.ok || !data.explanation) throw new Error(data.error || 'Feedback is unavailable right now.')
      setSaved(data.explanation)
    } finally { setEvaluating(false) }
  }

  async function submit() {
    if (busy.current || text.trim().length < 30 || text.trim().length > 5000) return
    busy.current = true
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/submit-explanation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, text }), signal: AbortSignal.timeout(15000),
      })
      const data = await res.json()
      if (!res.ok || !data.explanation) throw new Error(data.error || 'Could not confirm saving. Retry safely.')
      setSaved(data.explanation)
      setSaving(false)
      if (data.explanation.feedback_status !== 'ready') {
        try { await feedback() }
        catch { setError('Your explanation is saved. Feedback could not be completed; use the feedback button to try again.') }
      }
    } catch (error) {
      setError(error instanceof Error && error.name === 'Error' ? error.message
        : 'Could not confirm saving. Your draft is retained. Reconnect and retry safely.')
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  async function retryFeedback() {
    if (busy.current) return
    busy.current = true
    setError('')
    try { await feedback() }
    catch (error) {
      setError(error instanceof Error && error.name === 'Error' ? error.message
        : 'Your explanation is saved. Feedback is unavailable; try again later.')
    } finally { busy.current = false }
  }

  if (saved) {
    const retryable = saved.feedback_status !== 'ready' && saved.feedback_status !== 'unavailable'
      && (saved.feedback_attempts < 3 || saved.feedback_status === 'processing')
    return (
      <div className="space-y-5">
        <div role="status" className="rounded-xl border border-green-800 bg-green-900/20 p-5">
          <h2 className="font-semibold text-green-200">Explanation saved</h2>
          <p className="mt-1 text-sm text-gray-300">{saved.scheduled_review_date
            ? `Day 7 review scheduled for ${saved.scheduled_review_date} (UTC).`
            : 'You can return to this page to read your explanation.'}</p>
        </div>
        <details open className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <summary className="cursor-pointer font-medium text-white">Your saved explanation</summary>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{saved.text}</p>
        </details>
        <section aria-label="AI feedback" className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="font-semibold text-white">AI feedback</h2>
          <div role="status" className="mt-3 text-sm text-gray-300">
            {evaluating ? 'Your explanation is safe. Evaluating your approach…'
              : saved.feedback_status === 'ready' && saved.gaps !== null
                ? saved.gaps.length === 0 ? 'No major gaps found. Nice work!' : (
                  <ul className="list-disc space-y-2 pl-5">{saved.gaps.map((gap, i) => <li key={i}>{gap}</li>)}</ul>
                )
                : saved.feedback_status === 'unavailable'
                  ? 'Personalized feedback is no longer available for this cycle. Your saved explanation remains here.'
                  : saved.feedback_status === 'processing'
                    ? 'Feedback is being processed. If it has stalled, wait a minute and check again.'
                    : saved.feedback_attempts >= 3
                      ? 'Feedback could not be generated after three attempts. Your Day 7 review can use the question bank.'
                      : 'Feedback is not ready. You can request it without submitting your explanation again.'}
          </div>
          {retryable && <button onClick={retryFeedback} disabled={evaluating}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {evaluating ? 'Evaluating…' : saved.feedback_status === 'processing' ? 'Check feedback' : 'Get feedback'}
          </button>}
        </section>
        {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
        {evaluating && <p className="text-sm text-gray-400">Wait for feedback to finish, or continue now and check it later in Review history.</p>}
        <ReviewActions />
      </div>
    )
  }

  const count = text.trim().length
  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-sm leading-relaxed text-gray-300">
        Explain the technique, why it works, and the key steps. Include complexity and edge cases when useful.
        Your explanation is saved first; AI feedback is a separate step.
      </p>
      <div>
        <label htmlFor="explanation" className="mb-2 block font-medium text-gray-200">Your explanation</label>
        <textarea id="explanation" rows={8} value={text} disabled={saving} maxLength={5000}
          onChange={e => changeText(e.target.value)} aria-describedby="explanation-length draft-status"
          placeholder="Describe your reasoning in your own words…"
          className="w-full resize-y rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60" />
        <p id="explanation-length" className="mt-2 text-xs text-gray-400">{count} / 5000 characters · Minimum 30</p>
        <p id="draft-status" className={`mt-1 text-xs ${storageFailed ? 'text-amber-300' : 'text-gray-400'}`}>
          {storageFailed ? 'Browser storage is unavailable. Keep this page open until you submit.'
            : 'Draft saved automatically in this browser for this account. It is cleared after submission.'}
        </p>
      </div>
      <button onClick={submit} disabled={saving || count < 30 || count > 5000}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500">
        {saving ? 'Saving explanation…' : 'Save explanation'}
      </button>
      {error && <p role="alert" className="rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-300">{error}</p>}
    </div>
  )
}
