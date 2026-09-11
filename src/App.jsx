import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Clock3,
  Coins,
  History,
  Home,
  Info,
  Landmark,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
  X,
} from 'lucide-react'

const ROUND_SECONDS = 45
const LOCK_SECONDS = 8
const RESULT_SECONDS = 5
const STARTING_BALANCE = 1240
const STORAGE_KEY = 'prism-play-session-v1'

const COLOR_OPTIONS = [
  {
    id: 'green',
    label: 'Green',
    short: 'G',
    multiplier: 2.2,
    detail: 'Digits 2, 4, 6, 8',
    shape: 'square',
  },
  {
    id: 'red',
    label: 'Red',
    short: 'R',
    multiplier: 2.2,
    detail: 'Digits 1, 3, 7, 9',
    shape: 'triangle',
  },
  {
    id: 'violet',
    label: 'Violet',
    short: 'V',
    multiplier: 4.4,
    detail: 'Digits 0, 5',
    shape: 'diamond',
  },
]

const COLOR_BY_ID = Object.fromEntries(COLOR_OPTIONS.map((option) => [option.id, option]))

const NAVIGATION = [
  { id: 'play', label: 'Play', icon: Home },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'rules', label: 'Rules', icon: CircleHelp },
]

function outcomeFor(round) {
  const digit = (round * 37 + 17) % 10
  const color = digit === 0 || digit === 5 ? 'violet' : digit % 2 === 0 ? 'green' : 'red'
  return { round, digit, color, ...COLOR_BY_ID[color] }
}

function seededActivity() {
  const roundOne = outcomeFor(842174)
  const roundTwo = outcomeFor(842172)
  const roundThree = outcomeFor(842169)

  return [
    {
      id: 'seed-1',
      round: roundOne.round,
      selection: roundOne.color,
      amount: 80,
      potentialReturn: 176,
      payout: 176,
      status: 'won',
      outcome: roundOne,
      createdAt: '10:42 AM',
    },
    {
      id: 'seed-2',
      round: roundTwo.round,
      selection: 'violet',
      amount: 30,
      potentialReturn: 132,
      payout: 0,
      status: 'lost',
      outcome: roundTwo,
      createdAt: '10:31 AM',
    },
    {
      id: 'seed-3',
      round: roundThree.round,
      selection: roundThree.color,
      amount: 50,
      potentialReturn: Math.round(50 * roundThree.multiplier),
      payout: Math.round(50 * roundThree.multiplier),
      status: 'won',
      outcome: roundThree,
      createdAt: '10:12 AM',
    },
  ]
}

function readSession() {
  if (typeof window === 'undefined') {
    return { balance: STARTING_BALANCE, activity: seededActivity() }
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return { balance: STARTING_BALANCE, activity: seededActivity() }

    const parsed = JSON.parse(stored)
    return {
      balance: Number.isFinite(parsed.balance) ? parsed.balance : STARTING_BALANCE,
      activity: Array.isArray(parsed.activity) ? parsed.activity : seededActivity(),
    }
  } catch {
    return { balance: STARTING_BALANCE, activity: seededActivity() }
  }
}

function formatCredits(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
}

function formatRound(round) {
  return `CR-${round}`
}

function formatTimer(seconds) {
  return `00:${String(seconds).padStart(2, '0')}`
}

function statusLabel(status) {
  if (status === 'won') return 'Won'
  if (status === 'lost') return 'Not matched'
  return 'Pending'
}

function ChoiceMark({ option, compact = false }) {
  return (
    <span className={`choice-mark choice-mark--${option.id} choice-mark--${option.shape} ${compact ? 'choice-mark--compact' : ''}`} aria-hidden="true">
      <span>{option.short}</span>
    </span>
  )
}

function OutcomePill({ outcome, showRound = false }) {
  return (
    <div className={`outcome-pill outcome-pill--${outcome.color}`}>
      <ChoiceMark option={outcome} compact />
      <span className="outcome-pill__digit">{outcome.digit}</span>
      <span className="sr-only">{outcome.label} result, digit {outcome.digit}</span>
      {showRound && <span className="outcome-pill__round">{formatRound(outcome.round)}</span>}
    </div>
  )
}

function App() {
  const session = useMemo(readSession, [])
  const [activeView, setActiveView] = useState('play')
  const [balance, setBalance] = useState(session.balance)
  const [activity, setActivity] = useState(session.activity)
  const [roundNumber, setRoundNumber] = useState(842176)
  const [seconds, setSeconds] = useState(34)
  const [phase, setPhase] = useState('open')
  const [lastOutcome, setLastOutcome] = useState(null)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [stakeInput, setStakeInput] = useState('40')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all')
  const [toast, setToast] = useState(null)
  const activityRef = useRef(activity)

  const stake = Math.max(0, Math.floor(Number(stakeInput) || 0))
  const currentOption = selectedChoice ? COLOR_BY_ID[selectedChoice] : null
  const isLocked = phase !== 'open' || seconds <= LOCK_SECONDS
  const pendingForRound = activity.some((entry) => entry.status === 'pending' && entry.round === roundNumber)
  const canReview = Boolean(currentOption) && stake >= 10 && stake <= balance && !isLocked && !pendingForRound
  const recentOutcomes = useMemo(
    () => Array.from({ length: 8 }, (_, index) => outcomeFor(roundNumber - index - 1)),
    [roundNumber],
  )
  const displayOutcome = lastOutcome ?? recentOutcomes[0]
  const filteredActivity = useMemo(
    () => activity.filter((entry) => activityFilter === 'all' || entry.status === activityFilter),
    [activity, activityFilter],
  )
  const resolvedActivity = activity.filter((entry) => entry.status !== 'pending')
  const totalReturned = resolvedActivity.reduce((total, entry) => total + (entry.payout || 0), 0)
  const totalStaked = resolvedActivity.reduce((total, entry) => total + entry.amount, 0)

  useEffect(() => {
    activityRef.current = activity
  }, [activity])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ balance, activity }))
  }, [balance, activity])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!confirmOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setConfirmOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmOpen])

  const settleRound = useCallback(() => {
    const outcome = outcomeFor(roundNumber)
    const pending = activityRef.current.find((entry) => entry.status === 'pending' && entry.round === roundNumber)

    setLastOutcome(outcome)

    if (!pending) {
      setToast({ type: 'neutral', title: `${outcome.label} result`, detail: `Digit ${outcome.digit} closed ${formatRound(roundNumber)}.` })
      return
    }

    const won = pending.selection === outcome.color
    const payout = won ? pending.potentialReturn : 0
    const pickedOption = COLOR_BY_ID[pending.selection]

    setActivity((items) =>
      items.map((entry) =>
        entry.id === pending.id
          ? { ...entry, status: won ? 'won' : 'lost', outcome, payout, settledAt: 'Just now' }
          : entry,
      ),
    )
    if (won) setBalance((current) => current + payout)

    setToast({
      type: won ? 'success' : 'loss',
      title: won ? `${pickedOption.label} matched` : `${outcome.label} was drawn`,
      detail: won
        ? `${formatCredits(payout)} practice credits returned to your balance.`
        : `${formatCredits(pending.amount)} practice credits closed for this round.`,
    })
  }, [roundNumber])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((remaining) => {
        if (remaining > 1) return remaining - 1

        if (phase === 'result') {
          setRoundNumber((current) => current + 1)
          setPhase('open')
          setLastOutcome(null)
          return ROUND_SECONDS
        }

        settleRound()
        setPhase('result')
        return RESULT_SECONDS
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [phase, settleRound])

  useEffect(() => {
    if (isLocked) setConfirmOpen(false)
  }, [isLocked])

  function handleStake(amount) {
    setStakeInput(String(amount))
  }

  function confirmPrediction() {
    if (!currentOption || !canReview) return

    const prediction = {
      id: `prediction-${Date.now()}`,
      round: roundNumber,
      selection: currentOption.id,
      amount: stake,
      potentialReturn: Math.round(stake * currentOption.multiplier),
      payout: 0,
      status: 'pending',
      outcome: null,
      createdAt: 'Now',
    }

    setActivity((items) => [prediction, ...items])
    setBalance((current) => current - stake)
    setConfirmOpen(false)
    setSelectedChoice(null)
    setToast({
      type: 'success',
      title: 'Practice prediction placed',
      detail: `${formatCredits(stake)} credits are pending on ${currentOption.label}.`,
    })
  }

  function resetCredits() {
    setBalance(STARTING_BALANCE)
    setToast({ type: 'neutral', title: 'Practice balance restored', detail: `${formatCredits(STARTING_BALANCE)} virtual credits are ready.` })
  }

  function renderPlayView() {
    return (
      <>
        <section className="view-heading view-heading--play">
          <div>
            <p className="eyebrow">Live practice round</p>
            <h1>Pick the next color</h1>
          </div>
          <button className="icon-button" type="button" title="Open the rules" aria-label="Open the rules" onClick={() => setActiveView('rules')}>
            <CircleHelp size={19} />
          </button>
        </section>

        <section className={`round-stage round-stage--${phase}`} aria-live="polite">
          <div className="round-stage__topline">
            <span>{formatRound(roundNumber)}</span>
            <span className={`status-badge status-badge--${phase === 'result' ? 'result' : isLocked ? 'locked' : 'open'}`}>
              <span aria-hidden="true" />
              {phase === 'result' ? 'Result' : isLocked ? 'Locked' : 'Open'}
            </span>
          </div>

          <div className="round-stage__body">
            <div>
              <p className="round-stage__label">{phase === 'result' ? 'Round outcome' : isLocked ? 'Selections are closing' : 'Time remaining'}</p>
              <div className="timer-line">
                {phase === 'result' ? (
                  <div className="result-callout">
                    <ChoiceMark option={displayOutcome} />
                    <span>
                      <strong>{displayOutcome.label}</strong>
                      <small>Digit {displayOutcome.digit}</small>
                    </span>
                  </div>
                ) : (
                  <strong>{formatTimer(seconds)}</strong>
                )}
              </div>
              <div className="timer-track" aria-label={`${seconds} seconds remaining`}>
                <span style={{ width: `${Math.max(5, (seconds / ROUND_SECONDS) * 100)}%` }} />
              </div>
            </div>

            <div className="round-stage__signals" aria-label="Color round signal markers">
              {COLOR_OPTIONS.map((option) => (
                <ChoiceMark key={option.id} option={option} />
              ))}
            </div>
          </div>
        </section>

        <div className="play-grid">
          <section className="prediction-surface" aria-labelledby="prediction-title">
            <div className="surface-heading">
              <div>
                <p className="eyebrow">Your prediction</p>
                <h2 id="prediction-title">Choose a color</h2>
              </div>
              <span className="virtual-note"><Sparkles size={14} /> Virtual credits</span>
            </div>

            <div className="choice-grid" role="radiogroup" aria-label="Color choice">
              {COLOR_OPTIONS.map((option) => {
                const selected = selectedChoice === option.id
                return (
                  <button
                    className={`color-choice color-choice--${option.id} ${selected ? 'is-selected' : ''}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isLocked || pendingForRound}
                    key={option.id}
                    onClick={() => setSelectedChoice(option.id)}
                  >
                    <ChoiceMark option={option} />
                    <span className="color-choice__body">
                      <strong>{option.label}</strong>
                      <small>{option.detail}</small>
                    </span>
                    <span className="color-choice__return">{option.multiplier.toFixed(1)}x</span>
                  </button>
                )
              })}
            </div>

            <div className="stake-section">
              <div className="stake-section__label">
                <label htmlFor="stake">Practice credits</label>
                <span>Balance {formatCredits(balance)}</span>
              </div>
              <div className="stake-controls">
                <div className="stake-chips" aria-label="Quick credit amounts">
                  {[20, 40, 80, 160].map((amount) => (
                    <button
                      className={stake === amount ? 'is-active' : ''}
                      type="button"
                      disabled={isLocked || pendingForRound}
                      onClick={() => handleStake(amount)}
                      key={amount}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <div className="amount-input">
                  <Coins size={17} aria-hidden="true" />
                  <input
                    id="stake"
                    inputMode="numeric"
                    min="10"
                    step="10"
                    type="number"
                    value={stakeInput}
                    onChange={(event) => setStakeInput(event.target.value)}
                    disabled={isLocked || pendingForRound}
                    aria-label="Custom practice credit amount"
                  />
                </div>
              </div>
            </div>

            <div className="prediction-footer">
              <div className="prediction-estimate" aria-live="polite">
                <span>Potential return</span>
                <strong>{currentOption ? formatCredits(Math.round(stake * currentOption.multiplier)) : '--'} credits</strong>
              </div>
              <button className="primary-button" type="button" disabled={!canReview} onClick={() => setConfirmOpen(true)}>
                Review prediction
              </button>
            </div>
            {!isLocked && !pendingForRound && stake > balance && <p className="input-note input-note--error">Your practice balance is lower than this amount.</p>}
            {!isLocked && !pendingForRound && stake > 0 && stake < 10 && <p className="input-note input-note--error">Use at least 10 practice credits.</p>}
            {pendingForRound && <p className="input-note">A prediction is already waiting for this round.</p>}
            {isLocked && phase !== 'result' && <p className="input-note">This round is locked. The next round opens shortly.</p>}
          </section>

          <aside className="round-insight" aria-labelledby="round-insight-title">
            <div className="surface-heading">
              <div>
                <p className="eyebrow">Round board</p>
                <h2 id="round-insight-title">Recent results</h2>
              </div>
              <History size={19} aria-hidden="true" />
            </div>
            <div className="result-stack">
              {recentOutcomes.slice(0, 4).map((outcome) => (
                <div className="result-row" key={outcome.round}>
                  <span>{formatRound(outcome.round)}</span>
                  <OutcomePill outcome={outcome} />
                </div>
              ))}
            </div>
            <div className="insight-rule">
              <ShieldCheck size={18} aria-hidden="true" />
              <p>Each practice round maps one digit to a published color set.</p>
            </div>
          </aside>
        </div>

        <section className="history-surface" aria-labelledby="history-title">
          <div className="surface-heading">
            <div>
              <p className="eyebrow">Round stream</p>
              <h2 id="history-title">Last eight outcomes</h2>
            </div>
            <button className="text-button" type="button" onClick={() => setActiveView('activity')}>View activity</button>
          </div>
          <div className="outcome-stream">
            {recentOutcomes.map((outcome) => (
              <OutcomePill outcome={outcome} showRound key={outcome.round} />
            ))}
          </div>
        </section>
      </>
    )
  }

  function renderActivityView() {
    return (
      <>
        <section className="view-heading">
          <div>
            <p className="eyebrow">Practice ledger</p>
            <h1>Activity</h1>
          </div>
          <div className="ledger-summary" aria-label="Practice results summary">
            <span>Returned</span>
            <strong>{formatCredits(totalReturned)}</strong>
          </div>
        </section>

        <section className="activity-surface">
          <div className="activity-toolbar">
            <div className="filter-group" role="group" aria-label="Filter activity">
              {[
                ['all', 'All'],
                ['pending', 'Pending'],
                ['won', 'Won'],
                ['lost', 'Not matched'],
              ].map(([id, label]) => (
                <button className={activityFilter === id ? 'is-active' : ''} type="button" onClick={() => setActivityFilter(id)} key={id}>
                  {label}
                </button>
              ))}
            </div>
            <span className="activity-toolbar__total">{filteredActivity.length} entries</span>
          </div>

          {filteredActivity.length ? (
            <div className="activity-table-wrap">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Prediction</th>
                    <th>Credits</th>
                    <th>Result</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivity.map((entry) => {
                    const option = COLOR_BY_ID[entry.selection]
                    return (
                      <tr key={entry.id}>
                        <td>
                          <strong>{formatRound(entry.round)}</strong>
                          <span>{entry.createdAt}</span>
                        </td>
                        <td>
                          <span className="table-choice"><ChoiceMark option={option} compact /> {option.label}</span>
                        </td>
                        <td>{formatCredits(entry.amount)}</td>
                        <td>{entry.outcome ? <OutcomePill outcome={entry.outcome} /> : <span className="table-pending">Awaiting draw</span>}</td>
                        <td>
                          <span className={`table-status table-status--${entry.status}`}>{statusLabel(entry.status)}</span>
                          {entry.status === 'won' && <small>+{formatCredits(entry.payout)}</small>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <History size={28} aria-hidden="true" />
              <p>No entries match this filter.</p>
            </div>
          )}
        </section>

        <section className="activity-footnote">
          <ArrowDownRight size={18} aria-hidden="true" />
          <p>You have placed {activity.length} practice predictions. Credits do not represent cash or a withdrawable balance.</p>
        </section>
      </>
    )
  }

  function renderWalletView() {
    const netPractice = totalReturned - totalStaked
    return (
      <>
        <section className="view-heading">
          <div>
            <p className="eyebrow">Virtual balance</p>
            <h1>Wallet</h1>
          </div>
          <span className="practice-badge"><Sparkles size={14} /> Practice only</span>
        </section>

        <section className="wallet-stage">
          <div>
            <p>Available practice credits</p>
            <strong>{formatCredits(balance)}</strong>
            <span>Virtual credits reset anytime.</span>
          </div>
          <div className="wallet-stage__mark" aria-hidden="true">
            <Wallet size={42} strokeWidth={1.6} />
          </div>
        </section>

        <div className="wallet-grid">
          <section className="wallet-panel">
            <p className="eyebrow">Session snapshot</p>
            <dl>
              <div>
                <dt>Credits placed</dt>
                <dd>{formatCredits(totalStaked)}</dd>
              </div>
              <div>
                <dt>Credits returned</dt>
                <dd>{formatCredits(totalReturned)}</dd>
              </div>
              <div>
                <dt>Practice net</dt>
                <dd className={netPractice >= 0 ? 'value-positive' : 'value-negative'}>{netPractice >= 0 ? '+' : ''}{formatCredits(netPractice)}</dd>
              </div>
            </dl>
          </section>

          <section className="wallet-panel wallet-panel--action">
            <div>
              <p className="eyebrow">Fresh start</p>
              <h2>Reset your balance</h2>
              <p>Restores the default virtual-credit amount. Activity stays visible for this browser session.</p>
            </div>
            <button className="secondary-button" type="button" onClick={resetCredits}>
              <RotateCcw size={17} /> Reset credits
            </button>
          </section>
        </div>

        <section className="practice-notice">
          <Info size={20} aria-hidden="true" />
          <p>Prism Play is a front-end practice simulator. It does not accept deposits, offer withdrawals, or create a real-money account.</p>
        </section>
      </>
    )
  }

  function renderRulesView() {
    return (
      <>
        <section className="view-heading">
          <div>
            <p className="eyebrow">Practice round guide</p>
            <h1>Rules</h1>
          </div>
          <ShieldCheck className="heading-icon" size={28} aria-hidden="true" />
        </section>

        <section className="rules-surface">
          <div className="rules-intro">
            <p className="eyebrow">How outcomes work</p>
            <h2>One digit closes each color round.</h2>
            <p>The digit determines the color outcome. In this demo, outcomes are generated in the browser and are only for practice.</p>
          </div>
          <div className="rule-choices">
            {COLOR_OPTIONS.map((option) => (
              <div className={`rule-choice rule-choice--${option.id}`} key={option.id}>
                <ChoiceMark option={option} />
                <div>
                  <strong>{option.label}</strong>
                  <span>{option.detail}</span>
                </div>
                <b>{option.multiplier.toFixed(1)}x</b>
              </div>
            ))}
          </div>
        </section>

        <div className="rules-grid">
          <section className="rule-note">
            <Clock3 size={21} aria-hidden="true" />
            <div>
              <h2>Round timing</h2>
              <p>Selections are open for the first part of every round. The final {LOCK_SECONDS} seconds are locked while the result is prepared.</p>
            </div>
          </section>
          <section className="rule-note">
            <Trophy size={21} aria-hidden="true" />
            <div>
              <h2>Practice returns</h2>
              <p>A matching color returns the displayed multiplier in virtual credits. A non-match returns zero credits.</p>
            </div>
          </section>
          <section className="rule-note">
            <Landmark size={21} aria-hidden="true" />
            <div>
              <h2>Demo boundary</h2>
              <p>No payment, cash balance, account verification, or withdrawal system is included in this practice experience.</p>
            </div>
          </section>
        </div>
      </>
    )
  }

  let page
  if (activeView === 'activity') page = renderActivityView()
  else if (activeView === 'wallet') page = renderWalletView()
  else if (activeView === 'rules') page = renderRulesView()
  else page = renderPlayView()

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setActiveView('play')} aria-label="Go to Prism Play home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Prism <em>Play</em></span>
        </button>
        <div className="topbar__right">
          <span className="practice-badge"><Sparkles size={14} /> Practice mode</span>
          <button className="balance-button" type="button" onClick={() => setActiveView('wallet')} title="Open virtual wallet">
            <Wallet size={17} aria-hidden="true" />
            <span>{formatCredits(balance)}</span>
          </button>
        </div>
      </header>

      <div className="app-frame">
        <aside className="sidebar" aria-label="Main navigation">
          <div className="sidebar__caption">Workspace</div>
          <nav>
            {NAVIGATION.map((item) => {
              const Icon = item.icon
              return (
                <button className={activeView === item.id ? 'is-active' : ''} type="button" onClick={() => setActiveView(item.id)} key={item.id}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="sidebar__footer">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>Virtual-credit workspace</p>
          </div>
        </aside>

        <main className="main-content">{page}</main>
      </div>

      <nav className="mobile-nav" aria-label="Main navigation">
        {NAVIGATION.map((item) => {
          const Icon = item.icon
          return (
            <button className={activeView === item.id ? 'is-active' : ''} type="button" onClick={() => setActiveView(item.id)} key={item.id}>
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {confirmOpen && currentOption && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setConfirmOpen(false)}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="confirm-dialog__topline">
              <span className="eyebrow">Confirm practice prediction</span>
              <button className="icon-button" type="button" title="Close confirmation" aria-label="Close confirmation" onClick={() => setConfirmOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="confirm-choice">
              <ChoiceMark option={currentOption} />
              <div>
                <h2 id="confirm-title">{currentOption.label}</h2>
                <p>{formatRound(roundNumber)} · {currentOption.multiplier.toFixed(1)}x potential return</p>
              </div>
            </div>
            <dl className="confirm-details">
              <div><dt>Practice credits</dt><dd>{formatCredits(stake)}</dd></div>
              <div><dt>Potential return</dt><dd>{formatCredits(Math.round(stake * currentOption.multiplier))}</dd></div>
            </dl>
            <p className="confirm-disclaimer"><Info size={16} aria-hidden="true" /> This is a virtual-credit simulation with no cash value.</p>
            <div className="confirm-actions">
              <button className="secondary-button" type="button" onClick={() => setConfirmOpen(false)}>Back</button>
              <button className="primary-button" type="button" onClick={confirmPrediction}>Place practice prediction</button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className={`toast toast--${toast.type}`} role="status">
          {toast.type === 'success' ? <Check size={19} aria-hidden="true" /> : toast.type === 'loss' ? <ArrowDownRight size={19} aria-hidden="true" /> : <Info size={19} aria-hidden="true" />}
          <div><strong>{toast.title}</strong><span>{toast.detail}</span></div>
        </div>
      )}
    </div>
  )
}

export default App
