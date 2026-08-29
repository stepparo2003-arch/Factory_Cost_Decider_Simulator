'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Axes = [number, number, number, number, number];
type Option = { id: string; label: string; points: number; axes: Axes };
type Question = {
  kicker: string;
  title: string;
  context: string;
  signal: string;
  weight: number;
  seconds: number;
  multiple?: boolean;
  instruction?: string;
  options: Option[];
};

const AXES = ['Cost Lens', 'Pricing', 'Resources', 'Governance', 'Risk'];
const AXIS_MAX: Axes = [20, 20, 20, 20, 20];

const QUESTIONS: Question[] = [
  {
    kicker: '01 · PRICE SIGNAL',
    title: 'A key account wants the old price. Do you sign?',
    context: 'The market price of your core material has jumped 60%, while the weighted-average (WA) unit cost has risen only 22%. The customer wants the old price locked in for three months.',
    signal: 'The input price is moving faster than cost can flow through opening WIP.',
    weight: 15,
    seconds: 40,
    options: [
      { id: 'a', label: 'Sign. The reported cost still supports the current margin.', points: 0, axes: [1, 0, 0, 0, 0] },
      { id: 'b', label: 'Raise the selling price by the full 60% immediately.', points: 6, axes: [1, 2, 0, 0, 3] },
      { id: 'c', label: 'Reconcile WA with current replacement cost, then test the market ceiling and pass-through room.', points: 15, axes: [4, 5, 0, 4, 2] },
      { id: 'd', label: 'Switch to FIFO and treat FIFO as a forward-looking cost.', points: 7, axes: [3, 1, 0, 1, 2] },
    ],
  },
  {
    kicker: '02 · VOLUME RESPONSE',
    title: 'Input prices are falling. Do you cut output too?',
    context: 'Spot material prices have fallen for several weeks, but opening WIP keeps the reported unit cost high. Sales says the demand dip may be temporary.',
    signal: 'A stale high cost can make a profitable product look uncompetitive.',
    weight: 20,
    seconds: 40,
    options: [
      { id: 'a', label: 'Cut every production line to protect the reported margin.', points: 1, axes: [0, 0, 1, 0, 0] },
      { id: 'b', label: 'Hold the old plan until the reported cost catches up.', points: 5, axes: [1, 0, 2, 1, 1] },
      { id: 'c', label: 'Refresh run-rate contribution and demand scenarios, then adjust volume by product.', points: 20, axes: [4, 3, 5, 3, 5] },
      { id: 'd', label: 'Discount every product to buy back volume and ignore cost.', points: 4, axes: [0, 2, 1, 0, 1] },
    ],
  },
  {
    kicker: '03 · CONSTRAINED MIX',
    title: 'Only one product gets the bottleneck hours.',
    context: 'Core SKU shows a $100 reported unit margin and needs 4 bottleneck hours. Light SKU shows $55 and needs 2 hours. At replacement cost, their contributions are $80 and $70.',
    signal: 'Core: $80 ÷ 4h = $20/h · Light: $70 ÷ 2h = $35/h',
    weight: 25,
    seconds: 50,
    options: [
      { id: 'a', label: 'Prioritise Core because its unit margin is higher.', points: 4, axes: [1, 0, 1, 0, 2] },
      { id: 'b', label: 'Prioritise Light because contribution per bottleneck hour is higher.', points: 25, axes: [4, 2, 10, 3, 6] },
      { id: 'c', label: 'Split the hours evenly to avoid making the wrong call.', points: 8, axes: [1, 0, 3, 2, 2] },
      { id: 'd', label: 'Prioritise whichever product sells the most units.', points: 2, axes: [0, 1, 1, 0, 0] },
    ],
  },
  {
    kicker: '04 · GOVERNANCE DESIGN',
    title: 'Final call: which management rules do you approve?',
    context: 'WA remains the adopted financial-reporting method. You now need a weekly operating protocol that can withstand input-price volatility.',
    signal: 'Select every rule you should approve. Incorrect selections deduct points.',
    weight: 40,
    seconds: 60,
    multiple: true,
    instruction: 'MULTI-SELECT · CHOOSE EVERY VALID RULE',
    options: [
      { id: 'a', label: 'Keep the adopted WA method for reporting, with consistency, reconciliation and an audit trail.', points: 10, axes: [2, 0, 0, 6, 2] },
      { id: 'b', label: 'Use current replacement cost for short-term pricing, with a market ceiling and pass-through test.', points: 10, axes: [3, 5, 0, 1, 1] },
      { id: 'c', label: 'Use incremental relevant cost and contribution per scarce resource for constrained product mix.', points: 10, axes: [2, 0, 6, 1, 1] },
      { id: 'd', label: 'Bridge reported cost to economic cost in reviews, separating timing from operating performance.', points: 10, axes: [1, 1, 1, 5, 2] },
      { id: 'e', label: 'Use one unit cost for every decision to eliminate debate over cost lenses.', points: -6, axes: [-1, -1, -1, -2, -1] },
      { id: 'f', label: 'Switch accounting methods whenever input prices move materially.', points: -6, axes: [-1, 0, 0, -3, -2] },
    ],
  },
];

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

function Radar({ values }: { values: number[] }) {
  const points = values.map((value, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / values.length;
    const radius = 48 * clamp(value) / 100;
    return `${50 + Math.cos(angle) * radius}% ${50 + Math.sin(angle) * radius}%`;
  }).join(',');

  return (
    <div className="radar" aria-label={AXES.map((name, i) => `${name}: ${values[i]}`).join(', ')}>
      <div className="radar-grid grid-outer" />
      <div className="radar-grid grid-mid" />
      <div className="radar-grid grid-inner" />
      {AXES.map((axis, i) => <span className={`axis-label axis-${i}`} key={axis}>{axis}<b>{values[i]}</b></span>)}
      <div className="radar-fill" style={{ '--radar-shape': `polygon(${points})` } as CSSProperties} />
      <div className="radar-core" />
    </div>
  );
}

function RevealCard({ className, children }: { className: string; children: ReactNode }) {
  const cardRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (!('IntersectionObserver' in window)) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= .6) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: [.6] });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return <article ref={cardRef} className={`${className} reveal-card ${revealed ? 'is-revealed' : ''}`}>{children}</article>;
}

export default function Home() {
  const [stage, setStage] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [briefing, setBriefing] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(QUESTIONS[0].seconds);
  const [earned, setEarned] = useState<number[]>([]);
  const [axisTotals, setAxisTotals] = useState<Axes>([0, 0, 0, 0, 0]);
  const advancing = useRef(false);
  const question = QUESTIONS[index];

  const resetRun = () => {
    setIndex(0);
    setSelected([]);
    setEarned([]);
    setAxisTotals([0, 0, 0, 0, 0]);
    setSeconds(QUESTIONS[0].seconds);
    advancing.current = false;
  };

  const start = () => {
    resetRun();
    setBriefing(false);
    setStage('quiz');
  };

  const beginBriefing = () => {
    resetRun();
    setBriefing(true);
  };

  useEffect(() => {
    if (!briefing) return;
    const timer = window.setTimeout(() => {
      setBriefing(false);
      setStage('quiz');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [briefing]);

  const advance = useCallback((timedOut = false) => {
    if (advancing.current) return;
    advancing.current = true;
    const picks = timedOut ? [] : question.options.filter(option => selected.includes(option.id));
    const points = clamp(picks.reduce((sum, option) => sum + option.points, 0), 0, question.weight);
    const delta = picks.reduce<Axes>((sum, option) => sum.map((n, i) => n + option.axes[i]) as Axes, [0, 0, 0, 0, 0]);
    setEarned(previous => [...previous, points]);
    setAxisTotals(previous => previous.map((n, i) => clamp(n + delta[i], 0, AXIS_MAX[i])) as Axes);
    window.setTimeout(() => {
      if (index === QUESTIONS.length - 1) setStage('result');
      else {
        const next = index + 1;
        setIndex(next);
        setSelected([]);
        setSeconds(QUESTIONS[next].seconds);
        advancing.current = false;
      }
    }, 220);
  }, [index, question, selected]);

  useEffect(() => {
    if (stage !== 'quiz') return;
    const timer = window.setInterval(() => setSeconds(value => {
      if (value <= 1) {
        window.clearInterval(timer);
        window.setTimeout(() => advance(true), 0);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [stage, index, advance]);

  const toggle = (id: string) => {
    if (advancing.current) return;
    setSelected(current => question.multiple
      ? current.includes(id) ? current.filter(item => item !== id) : [...current, id]
      : [id]);
  };

  const total = earned.reduce((sum, n) => sum + n, 0);
  const radarValues = axisTotals.map((n, i) => Math.round(n / AXIS_MAX[i] * 100));
  const result = useMemo(() => {
    if (total >= 85) return { grade: 'A', title: 'Counter-Cycle Operator', copy: 'You separate reporting cost from decision cost and turn imperfect signals into disciplined action.' };
    if (total >= 70) return { grade: 'B', title: 'Resilient Plant Owner', copy: 'Most calls were sound. Tighten bottleneck prioritisation and the reported-to-economic bridge.' };
    if (total >= 50) return { grade: 'C', title: 'Experienced Operator', copy: 'You recognise the risk, but sometimes let one cost number make the decision for you.' };
    return { grade: 'D', title: 'Cost-Signal Follower', copy: 'The factory is being steered by stale cost. Recheck the cost period, replacement cost and decision purpose.' };
  }, [total]);
  const factory = {
    profit: Math.round(clamp(38 + total * .55)),
    cash: Math.round(clamp(36 + radarValues[0] * .28 + radarValues[4] * .24)),
    resilience: Math.round(clamp(30 + radarValues[3] * .42 + radarValues[2] * .26)),
  };

  return (
    <main className={`sim-shell stage-${stage}`}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" />NORTHSTAR WORKS</div>
        <div className="status"><span className="status-dot" /> FACTORY ONLINE</div>
      </header>

      {stage === 'intro' && (
        <section className="intro enter">
          <div className="hero-banner" role="img" aria-label="A factory owner studying production forecasts and resource-allocation decisions" />
          <div className="hero-command">
            <div className="hero-copy">
              <span className="eyebrow">MANUFACTURER OWNER SIMULATOR · ACCT90009</span>
              <h1>Your factory. <em>Your four calls.</em></h1>
              <p>A product cost can be technically correct—and still drive the wrong business decision.</p>
            </div>
            <div className="mission-stats" aria-label="Simulation details">
              <div><strong>04</strong><span>DECISIONS</span></div>
              <div><strong>≈3</strong><span>MINUTES</span></div>
              <div><strong>100</strong><span>POINTS</span></div>
            </div>
            <button className="start-button" type="button" onClick={beginBriefing}>
              <span>TAKE THE OWNER&apos;S SEAT</span><span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="scenario-note">ILLUSTRATIVE SCENARIO · INPUT PRICES ARE VOLATILE · CASH AND CAPACITY ARE LIMITED</div>
          <div className="creator-credit">Created By Roli</div>
        </section>
      )}

      {stage === 'quiz' && (
        <section className="quiz enter" aria-live="polite">
          <div className="quiz-rail">
            <div className="question-count"><strong>0{index + 1}</strong><span>/ 04</span></div>
            <div className="rail-line">{QUESTIONS.map((_, i) => <i key={i} className={i < index ? 'done' : i === index ? 'active' : ''} />)}</div>
            <div className={`timer ${seconds <= 8 ? 'urgent' : ''}`} style={{ background: `conic-gradient(var(--timer-color) ${seconds / question.seconds * 360}deg, rgba(255,255,255,.1) 0deg)` }}>
              <div><strong>{seconds}</strong><span>SEC</span></div>
            </div>
            <div className="weight"><span>QUESTION VALUE</span><strong>{question.weight}</strong><small>PTS</small></div>
          </div>

          <article className="decision-sheet">
            <div className="sheet-tag">OWNER&apos;S DECISION FILE</div>
            <div className="question-kicker">{question.kicker}</div>
            <h2>{question.title}</h2>
            <p className="context">{question.context}</p>
            <div className="signal"><span>LIVE SIGNAL</span>{question.signal}</div>
            {question.instruction && <div className="multi-note">{question.instruction}</div>}
            <div className={`options ${question.options.length > 4 ? 'options-dense' : ''}`}>
              {question.options.map((option, optionIndex) => {
                const active = selected.includes(option.id);
                return (
                  <button key={option.id} type="button" className={`option ${active ? 'selected' : ''}`} onClick={() => toggle(option.id)} aria-pressed={active}>
                    <span className="option-key">{question.multiple ? (active ? '✓' : '□') : String.fromCharCode(65 + optionIndex)}</span>
                    <span>{option.label}</span>
                    <span className="option-arrow">{active ? 'LOCKED' : '↗'}</span>
                  </button>
                );
              })}
            </div>
            <div className="quiz-actions">
              <span>The timer submits automatically when it reaches zero.</span>
              <button type="button" disabled={!selected.length} onClick={() => advance(false)}>LOCK DECISION <b>→</b></button>
            </div>
          </article>
        </section>
      )}

      {stage === 'result' && (
        <section className="results enter">
          <div className="result-heading"><div className="eyebrow">FINAL OPERATING REVIEW</div><h2>Your factory has delivered its verdict.</h2></div>
          <div className="result-grid">
            <article className="score-panel">
              <div className="panel-label">DECISION SCORE</div>
              <div className="score-overview">
                <div className="score-lockup"><strong>{total}</strong><small>/ 100</small><em>{result.grade}</em></div>
                <div className={`grade-portrait grade-${result.grade.toLowerCase()}`} role="img" aria-label={`${result.grade}-rated factory owner`} />
              </div>
              <h3>{result.title}</h3><p>{result.copy}</p>
              <div className="question-strip">{QUESTIONS.map((item, i) => <div key={item.kicker}><span>Q{i + 1}</span><b>{earned[i] ?? 0}</b><small>/{item.weight}</small></div>)}</div>
            </article>
            <RevealCard className="radar-panel"><div className="panel-label">MANAGEMENT RADAR</div><Radar values={radarValues} /></RevealCard>
            <RevealCard className="factory-panel">
              <div className="panel-label">FACTORY OUTCOME</div>
              {([['Profitability', factory.profit], ['Cash Safety', factory.cash], ['Operating Resilience', factory.resilience]] as [string, number][]).map(([label, value]) => (
                <div className="metric" key={label}><div><span>{label}</span><strong>{value}</strong></div><div className="metric-track"><i style={{ '--metric-width': `${value}%` } as CSSProperties} /></div></div>
              ))}
              <div className="operating-result"><span>OPERATING VERDICT</span><strong>{total >= 70 ? 'The factory protected both growth and cash.' : total >= 50 ? 'The factory is running, but remains exposed to cost lag.' : 'Bad signals are eroding profit and cash.'}</strong></div>
            </RevealCard>
          </div>
          <div className="result-footer"><p>Remember: <b>one accounting truth · multiple decision lenses · one reconciliation</b></p><button type="button" onClick={start}>RUN IT AGAIN ↻</button></div>
        </section>
      )}

      {briefing && (
        <div className="briefing-overlay" role="dialog" aria-modal="true" aria-label="Decision guidance">
          <div className="briefing-dialog">
            <p>Each scenario allows multiple valid responses—there is no single correct answer.</p>
            <div className="briefing-progress" aria-hidden="true"><i /></div>
          </div>
        </div>
      )}
    </main>
  );
}
