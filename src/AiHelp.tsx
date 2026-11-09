import { useEffect, useRef, useState } from 'react'
import { answer } from './lolScope'
type Msg = { r: 'ai' | 'me'; t: string }
function Typed({ t, on }: { t: string; on: boolean }) {
  const [n, setN] = useState(on ? 0 : t.length)
  useEffect(() => { if (n >= t.length) return; const id = setTimeout(() => setN(n + 2), 14); return () => clearTimeout(id) }, [n, t])
  return <>{t.slice(0, n)}{n < t.length && <b className="aih-caret" />}</>
}
const SUG = ['🏆 Jak wyjść z Silvera?', '🐎 Build na Hecarima?', '🐉 Kiedy brać smoka?', '🌾 Jak lepiej farmić?', '🪓 Jak grać Dravenem?', '👁️ Jak wardować?']
export default function AiHelp() {
  const [m, setM] = useState<Msg[]>([{ r: 'ai', t: 'Cześć! Jestem AI Rifted — pytaj o wszystko z League of Legends: buildy, runy, matchupy, makro.' }])
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { const l = end.current?.parentElement; l?.scrollTo({ top: l.scrollHeight, behavior: 'smooth' }) }, [m, busy])
  const send = (t = q) => { const v = t.trim(); if (!v || busy) return
    const priorUser = m.filter(x => x.r === 'me').map(x => x.t)
    const lastAi = [...m].reverse().find(x => x.r === 'ai')?.t ?? ''
    setM(x => [...x, { r: 'me', t: v }]); setQ(''); setBusy(true)
    setTimeout(() => { setM(x => [...x, { r: 'ai', t: answer(v, { priorUser, lastAi }) }]); setBusy(false) }, 650) }
  return (
    <div className="glass aih"><div className="aih-orb o1"/><div className="aih-orb o2"/>
      <div className="aih-h"><div className="aih-ico">✦</div><div><h2>AI pomoc</h2><span><i className="aih-live"/>Online · tylko League of Legends</span></div><div className="aih-badge">🛡️ Filtr LoL</div></div>
      <div className="aih-log">
        {m.map((x, i) => <div key={i} className={'aih-row ' + x.r}>{x.r === 'ai' && <div className="aih-av">✦</div>}<div className={'aih-m ' + x.r}>{x.r === 'ai' ? <Typed t={x.t} on={i > 0} /> : x.t}</div></div>)}
        {busy && <div className="aih-row ai"><div className="aih-av spin">✦</div><div className="aih-m ai typing"><i/><i/><i/></div></div>}
        <div ref={end} />
      </div>
      {<div className="aih-sug">{SUG.filter(x => !m.some(y => y.t === x)).slice(0, 4).map((s, i) => <button key={s} className="pill" style={{ animationDelay: i * 70 + 'ms' }} onClick={() => send(s)}>{s}</button>)}</div>}
      <form className="aih-f" onSubmit={e => { e.preventDefault(); send() }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Zapytaj o LoL… np. „jak grać vs Darius?”" maxLength={300} />
        <button className="pill cta" type="submit" disabled={busy || !q.trim()}>Wyślij</button>
      </form>
    </div>
  )
}
