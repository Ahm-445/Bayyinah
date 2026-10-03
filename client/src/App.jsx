import { useCallback, useMemo, useState } from 'react'
import { decideDraft, getPublishedAnswer, getReviewQueue, submitQuestion } from './lib/api.js'
import './App.css'

const EXAMPLES = [
  { label: 'What is Tawhid?', text: 'What is Tawhid?', language: 'en' },
  { label: 'ما هو الإسلام؟', text: 'ما هو الإسلام؟', language: 'ar' },
]

function makeQuestionId() {
  return globalThis.crypto?.randomUUID?.() || `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getOutcome(result) {
  if (!result) return null
  if (result.safety?.decision === 'BLOCK') {
    return { tone: 'danger', title: 'This request was blocked', message: 'The safety review did not allow an answer. Nothing was sent for publication.' }
  }
  if (result.action === 'REFER') {
    return { tone: 'warning', title: 'Referred for qualified guidance', message: 'Bayyinah did not prepare a normal answer for this request.' }
  }
  if (result.action === 'ABSTAIN') {
    return { tone: 'warning', title: 'No answer was prepared', message: 'The evidence or verification checks did not support an answer. This result is not in the publication queue.' }
  }
  if (result.action === 'CLARIFY') {
    return { tone: 'warning', title: 'More detail is needed', message: 'Please clarify the question before an answer can be prepared.' }
  }
  if (result.action !== 'ANSWER' || result.draftStatus !== 'pending_review' || result.published !== false) {
    return { tone: 'warning', title: 'No publishable draft is available', message: 'The result has not entered Da‘i review and is not published.' }
  }
  if (result.verification?.status === 'FAIL') {
    return { tone: 'danger', title: 'Verification failed', message: 'This draft cannot be reviewed for publication.' }
  }
  return { tone: 'success', title: 'AI draft ready for Da‘i review', message: 'This is a draft only. It has not been published.' }
}

function requiresAcknowledgement(draft) {
  return draft.safety?.decision === 'REVIEW' ||
    draft.verification?.status === 'NEEDS_REVIEW' ||
    (draft.verification?.warnings || []).length > 0 ||
    (draft.verification?.riskFlags || []).length > 0
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function CitationList({ citations = [] }) {
  if (!citations.length) return <p className="muted">No citations were attached.</p>
  return (
    <ul className="citation-list">
      {citations.map((citation, index) => (
        <li key={`${citation.sourceId || 'source'}-${citation.chunkId || index}`}>
          <span className="citation-mark">{String(index + 1).padStart(2, '0')}</span>
          <span>
            <strong>{citation.sourceTitle || citation.sourceId || 'Source'}</strong>
            {citation.reference && <small>{citation.reference}</small>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ClassificationDetails({ result }) {
  return (
    <dl className="result-metadata">
      <div><dt>Category</dt><dd>{result.classification?.category || '—'}</dd></div>
      <div><dt>Level</dt><dd>{result.classification?.level || '—'}</dd></div>
      <div><dt>Risk</dt><dd>{result.classification?.risk || '—'}</dd></div>
      <div><dt>Safety</dt><dd>{result.safety?.decision || '—'}</dd></div>
      <div><dt>Verification</dt><dd>{result.verification?.status || 'Not run'}</dd></div>
    </dl>
  )
}

function SeekerResult({ result, questionId, publishedAnswer, onOpenReview }) {
  const outcome = getOutcome(result)
  const isPendingDraft = outcome?.tone === 'success'
  return (
    <section className="result-panel" aria-live="polite">
      <div className={`outcome-banner outcome-${outcome.tone}`}>
        <div className="outcome-icon" aria-hidden="true">{outcome.tone === 'success' ? '✓' : '!'}</div>
        <div>
          <p className="eyebrow">AI result · {result.action}</p>
          <h2>{outcome.title}</h2>
          <p>{outcome.message}</p>
        </div>
      </div>

      <div className="result-toolbar">
        <span className="question-ref">Question {questionId}</span>
        {isPendingDraft && (
          <div className="status-pair" aria-label="Publication state">
            <Badge tone="warning">Draft: pending review</Badge>
            <Badge tone="danger">Published: no</Badge>
          </div>
        )}
      </div>

      <ClassificationDetails result={result} />

      {isPendingDraft && result.draft && (
        <div className="draft-card">
          <div className="card-heading">
            <div><p className="eyebrow">Not yet public</p><h3>Suggested answer</h3></div>
            <Badge tone="warning">Awaiting Da‘i review</Badge>
          </div>
          <p className="draft-answer" dir="auto">{result.draft.answer}</p>
          <h4>Sources used</h4>
          <CitationList citations={result.draft.citations} />
          <button className="button button-primary" onClick={onOpenReview}>
            Open Da‘i review <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {!isPendingDraft && result.safety?.reason && (
        <div className="reason-card"><span className="eyebrow">Why this result</span><p>{result.safety.reason}</p></div>
      )}

      {publishedAnswer?.published && publishedAnswer.questionId === questionId && (
        <div className="published-card">
          <div className="card-heading"><div><p className="eyebrow">Da‘i-approved answer</p><h3>Published after review</h3></div><Badge tone="success">Published</Badge></div>
          <p className="draft-answer" dir="auto">{publishedAnswer.answer.text}</p>
          <CitationList citations={publishedAnswer.answer.citations} />
        </div>
      )}
    </section>
  )
}

function ReviewCard({ item, busy, onDecision }) {
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false)
  const requiresAck = requiresAcknowledgement(item)
  const verification = item.verification || {}
  return (
    <article className="review-card">
      <div className="review-card-top">
        <div><p className="eyebrow">Question {item.questionId}</p><h3 dir="auto">{item.questionText}</h3></div>
        <Badge tone="warning">Pending review</Badge>
      </div>
      <ClassificationDetails result={item} />
      <div className="review-answer">
        <div className="card-heading"><h4>AI draft</h4><Badge tone="danger">Not published</Badge></div>
        <p className="draft-answer" dir="auto">{item.draft?.answer}</p>
        <h4>Citations</h4>
        <CitationList citations={item.draft?.citations} />
      </div>
      <details className="evidence-details">
        <summary>Review evidence ({item.evidence?.length || 0})</summary>
        <div className="evidence-list">
          {(item.evidence || []).map((evidence) => (
            <div className="evidence-item" key={`${evidence.sourceId}-${evidence.chunkId}`}>
              <div><strong>{evidence.citation?.sourceTitle || evidence.sourceId}</strong><small>{evidence.citation?.reference || evidence.chunkId}</small></div>
              <p dir="auto">{evidence.text}</p>
            </div>
          ))}
        </div>
      </details>
      {(requiresAck || verification.unsupportedClaims?.length) && (
        <div className="review-warning">
          <strong>Review notes</strong>
          {verification.warnings?.map((warning) => <p key={warning}>{warning}</p>)}
          {verification.riskFlags?.map((flag) => <p key={flag}>Risk: {flag}</p>)}
          {verification.unsupportedClaims?.map((claim) => <p key={claim}>{claim}</p>)}
          {requiresAck && (
            <label className="acknowledge-control">
              <input type="checkbox" checked={acknowledgeWarnings} onChange={(event) => setAcknowledgeWarnings(event.target.checked)} />
              I reviewed these notes and acknowledge them before publishing.
            </label>
          )}
        </div>
      )}
      <div className="review-actions">
        <button className="button button-quiet" disabled={busy} onClick={() => onDecision(item.draftId, 'reject', false)}>Reject draft</button>
        <button className="button button-primary" disabled={busy || (requiresAck && !acknowledgeWarnings)} onClick={() => onDecision(item.draftId, 'approve', acknowledgeWarnings)}>
          {busy ? 'Saving…' : 'Approve and publish'}
        </button>
      </div>
    </article>
  )
}

function App() {
  const [mode, setMode] = useState('seeker')
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('en')
  const [questionId, setQuestionId] = useState(null)
  const [result, setResult] = useState(null)
  const [publishedAnswer, setPublishedAnswer] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)
  const [busyDraftId, setBusyDraftId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canSubmit = useMemo(() => text.trim().length > 0 && !loading, [text, loading])

  const refreshQueue = useCallback(async () => {
    setQueueLoading(true)
    setError('')
    try {
      const payload = await getReviewQueue()
      setQueue(payload.drafts || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setQueueLoading(false)
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    const id = makeQuestionId()
    setLoading(true)
    setError('')
    setNotice('')
    setResult(null)
    setPublishedAnswer(null)
    setQuestionId(id)
    try {
      const payload = await submitQuestion({ questionId: id, text: text.trim(), language })
      setResult(payload)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReviewDecision(draftId, decision, acknowledgeWarnings) {
    setBusyDraftId(draftId)
    setError('')
    setNotice('')
    try {
      const outcome = await decideDraft({ draftId, decision, acknowledgeWarnings })
      if (outcome.published) {
        setNotice('Approved and published. The seeker can now retrieve the reviewed answer.')
        const published = await getPublishedAnswer(outcome.questionId)
        setPublishedAnswer(published)
      } else {
        setNotice('Draft rejected. It remains unpublished.')
      }
      await refreshQueue()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyDraftId(null)
    }
  }

  async function openSeekerView() {
    setMode('seeker')
    if (!questionId) return
    try {
      const published = await getPublishedAnswer(questionId)
      setPublishedAnswer(published)
    } catch (requestError) {
      if (requestError.status !== 404) setError(requestError.message)
      else setPublishedAnswer(null)
    }
  }

  function openReviewView() {
    setMode('review')
    setNotice('')
    refreshQueue()
  }

  function selectExample(example) {
    setText(example.text)
    setLanguage(example.language)
    setResult(null)
    setQuestionId(null)
    setPublishedAnswer(null)
    setError('')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Bayyinah home">
          <span className="brand-mark" aria-hidden="true">ب</span>
          <span><strong>Bayyinah</strong><small>بيّنة · Knowledge with care</small></span>
        </a>
        <div className="demo-label"><span className="live-dot" /> DEMO WORKFLOW</div>
      </header>

      <main id="top">
        <section className="intro-grid">
          <div className="intro-copy">
            <p className="eyebrow">Source-grounded · Human-reviewed</p>
            <h1>Good answers take<br /><em>evidence and care.</em></h1>
            <p className="intro-text">Ask a question about Islam. Bayyinah prepares a sourced AI draft, then a Da‘i reviews it before anything is published.</p>
          </div>
          <div className="workflow-card" aria-label="Demo workflow steps">
            <div className="workflow-step"><span>01</span><div><strong>Ask</strong><small>Question submitted</small></div></div>
            <div className="workflow-line" />
            <div className="workflow-step"><span>02</span><div><strong>Prepare</strong><small>Evidence and AI draft</small></div></div>
            <div className="workflow-line" />
            <div className="workflow-step"><span>03</span><div><strong>Review</strong><small>Da‘i decision</small></div></div>
            <div className="workflow-line" />
            <div className="workflow-step"><span>04</span><div><strong>Publish</strong><small>Only after approval</small></div></div>
          </div>
        </section>

        <section className="demo-workspace">
          <div className="workspace-heading">
            <div><p className="eyebrow">Bayyinah demo</p><h2>Question to reviewed answer</h2></div>
            <div className="mode-switch" role="tablist" aria-label="Demo role">
              <button role="tab" aria-selected={mode === 'seeker'} className={mode === 'seeker' ? 'active' : ''} onClick={openSeekerView}>Seeker</button>
              <button role="tab" aria-selected={mode === 'review'} className={mode === 'review' ? 'active' : ''} onClick={openReviewView}>Da‘i review <span className="queue-count">{queue.length}</span></button>
            </div>
          </div>

          {error && <div className="alert alert-error" role="alert"><strong>Couldn’t complete that step</strong><span>{error}</span></div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}

          {mode === 'seeker' ? (
            <div className="workspace-grid">
              <form className="question-form" onSubmit={handleSubmit}>
                <label htmlFor="question-input" className="field-label">Your question</label>
                <textarea id="question-input" value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Ask a clear question about Islam…" dir="auto" required />
                <div className="form-meta"><span>{text.trim().length}/2000 characters</span><label>Question language <select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="en">English</option><option value="ar">العربية</option></select></label></div>
                <button type="submit" className="button button-primary button-submit" disabled={!canSubmit}>{loading ? <><span className="spinner" /> Preparing a sourced draft…</> : <>Submit question <span aria-hidden="true">→</span></>}</button>
                <p className="form-note">The language selection is stored with the question. The AI detects answer language from the question itself.</p>
                <div className="example-row"><span>Try:</span>{EXAMPLES.map((example) => <button type="button" key={example.label} onClick={() => selectExample(example)}>{example.label}</button>)}</div>
              </form>
              <aside className="trust-card">
                <div className="trust-icon" aria-hidden="true">✳</div>
                <p className="eyebrow">A careful process</p>
                <h3>AI drafts.<br />A Da‘i decides.</h3>
                <p>Every generated answer stays unpublished until a reviewer checks the evidence and approves it.</p>
                <div className="trust-divider" />
                <div className="trust-state"><span className="state-dot state-gold" /> Drafts are private to the review queue</div>
                <div className="trust-state"><span className="state-dot state-green" /> Publication follows approval</div>
              </aside>
              {result && questionId && <div className="result-slot"><SeekerResult result={result} questionId={questionId} publishedAnswer={publishedAnswer} onOpenReview={openReviewView} /></div>}
            </div>
          ) : (
            <section className="review-workspace">
              <div className="review-intro"><div><p className="eyebrow">Human decision</p><h3>Da‘i review queue</h3><p>Review the generated text and its source evidence. Approval is the only action that makes an answer available as published.</p></div><button className="button button-outline" onClick={refreshQueue} disabled={queueLoading}>{queueLoading ? 'Refreshing…' : 'Refresh queue'}</button></div>
              {queueLoading && <div className="empty-state">Loading pending drafts…</div>}
              {!queueLoading && queue.length === 0 && <div className="empty-state"><span className="empty-icon">✓</span><strong>No drafts are waiting</strong><p>Submit a seeker question to create an eligible AI draft for review.</p><button className="button button-outline" onClick={openSeekerView}>Go to seeker view</button></div>}
              <div className="review-list">{queue.map((item) => <ReviewCard key={item.draftId} item={item} busy={busyDraftId === item.draftId} onDecision={handleReviewDecision} />)}</div>
              <p className="demo-warning">Demo note: reviewer endpoints are unauthenticated in this hackathon skeleton. Do not expose this demo publicly.</p>
            </section>
          )}
        </section>
      </main>

      <footer><span>Bayyinah · بيّنة</span><span>Evidence first. Human review before publication.</span></footer>
    </div>
  )
}

export default App
