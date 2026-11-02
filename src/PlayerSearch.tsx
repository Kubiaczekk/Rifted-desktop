import { useState } from 'react'
import { DEFAULT_REGION, REGIONS, lookupPlayer, type GameRow, type Profile, type Suggestion } from './deeplol'

const wr = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
const kdaTxt = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function gry(n: number) {
  const m = n % 10, t = n % 100
  if (n === 1) return '1 gra'
  if (m >= 2 && m <= 4 && !(t >= 12 && t <= 14)) return `${n} gry`
  return `${n} gier`
}

function Ico({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [bad, setBad] = useState(false)
  if (!src || bad) return <span className={className || 'ps-fallback'}>{(alt || '?')[0]}</span>
  return <img className={className} src={src} alt={alt} onError={() => setBad(true)} />
}

function Game({ g }: { g: GameRow }) {
  return (
    <div className={g.win ? 'ps-g win' : 'ps-g loss'}>
      <b className="ps-r" title={g.win ? 'Wygrana' : 'Porażka'}>{g.win ? 'W' : 'P'}</b>
      <Ico className="ps-cimg" src={g.champImg} alt={g.champ} />
      <span className="ps-c">{g.champ}<small>{g.role}</small></span>
      <span className="ps-k">{g.k} / {g.d} / {g.a}</span>
      <small className="ps-s">{kdaTxt(g.d ? (g.k + g.a) / g.d : g.k + g.a)} KDA · {g.queue}{g.min ? ` · ${g.min} min` : ''}</small>
      <span className="ps-it">{g.items.map(it => <img key={it.id} src={it.img} alt="" />)}</span>
    </div>
  )
}

function Card({ p }: { p: Profile }) {
  return (
    <article className="ps-card">
      <header className="ps-head">
        <div className="ps-av"><Ico src={p.icon} alt={p.name} /></div>
        <div className="ps-id">
          <h3>{p.name}<span>#{p.tag}</span></h3>
          <div className="ps-tags">
            <span>{p.region}</span>
            <span className={`lfd-rank r-${p.rankKey}`}>{p.rank}{p.lp != null ? ` · ${p.lp} LP` : ''}</span>
            {p.level > 0 && <span>poziom {p.level}</span>}
          </div>
        </div>
      </header>
      {p.badge === 'smurf' && <div className="ps-flag smurf">Podejrzenie smurfa<small>na podstawie {p.badgeFrom}</small></div>}
      {p.badge === 'weak' && <div className="ps-flag weak">Słabszy gracz — ostrożnie z duo<small>na podstawie {p.badgeFrom}</small></div>}
      <div className="ps-stats">
        <div><b>{p.sampleWr == null ? '—' : wr(p.sampleWr)}</b><span>WR · ostatnie {gry(p.sampleGames)}</span></div>
        <div><b>{p.avgKda == null ? '—' : kdaTxt(p.avgKda)}</b><span>Średnie KDA</span></div>
        <div><b>{p.solo ? wr(p.solo.wr) : '—'}</b><span>WR Solo/Duo{p.solo ? ` · ${gry(p.solo.games)}` : ''}</span></div>
        <div><b>{p.solo ? `${p.solo.wins}W ${p.solo.losses}P` : '—'}</b><span>Bilans Solo/Duo</span></div>
      </div>
      {p.flex && <p className="ps-flex">Flex: {wr(p.flex.wr)} · {p.flex.wins}W {p.flex.losses}P · {gry(p.flex.games)}</p>}
      {(p.mains.length > 0 || p.roles.length > 0) && (
        <div className="ps-mains">
          {p.roles.length > 0 && <div className="ps-roles"><span>Role</span>{p.roles.map(r => <b key={r.role}>{r.role} {Math.round(r.rate)}%</b>)}</div>}
          {p.mains.length > 0 && <div className="ps-champs"><span>Najczęściej</span>{p.mains.map(m => (
            <div key={m.champ} className="ps-main" title={`${m.champ}, ${m.role}, ${wr(m.wr)}, ${gry(m.games)}`}>
              <Ico src={m.img} alt={m.champ} />
              <div><b>{m.champ}</b><small>{m.role} · {wr(m.wr)} · {gry(m.games)}</small></div>
            </div>
          ))}</div>}
        </div>
      )}
      <h4>{p.games.length ? `Ostatnie ${gry(p.games.length)}` : 'Ostatnie gry'}</h4>
      {p.games.length === 0 && <p className="muted ps-empty">{p.gamesNote}</p>}
      {p.games.length > 0 && <div className="ps-games">{p.games.map((g, i) => <Game key={i} g={g} />)}</div>}
      {p.gamesNote && p.games.length > 0 && <p className="muted ps-empty">{p.gamesNote}</p>}
      <a className="pill ps-link" href={p.url} target="_blank" rel="noreferrer">Otwórz na DeepLOL</a>
    </article>
  )
}

export default function PlayerSearch({ onClose }: { onClose: () => void }) {
  const [region, setRegion] = useState<string>(DEFAULT_REGION)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [hint, setHint] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [opts, setOpts] = useState<Suggestion[] | null>(null)

  const run = async (query: string) => {
    setErr(''); setOpts(null); setProfile(null); setHint(false); setBusy(true)
    try {
      const res = await lookupPlayer(query, region)
      if (res.kind === 'missing') setErr('Nie znaleziono gracza na DeepLOL. Sprawdź nick, tag (#) i region.')
      else if (res.kind === 'choose') setOpts(res.options)
      else setProfile(res.profile)
    } catch (e) { setErr((e as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <div className="ps">
      <button type="button" className="ps-back" onClick={onClose}>← Wróć do ogłoszeń</button>
      <form className="ps-form" onSubmit={e => { e.preventDefault(); run(q) }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nick, np. Jankos#EUNE" maxLength={40} aria-label="Nick Riot" />
        <select value={region} onChange={e => setRegion(e.target.value)} aria-label="Region">
          {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button className="pill cta" type="submit" disabled={busy}>{busy ? 'Szukam…' : 'Szukaj'}</button>
      </form>
      {busy && <p className="muted ps-empty">Szukam na DeepLOL…</p>}
      {!busy && hint && <p className="muted ps-empty">Wpisz nick Riot. Tag po # jest opcjonalny — bez niego użyjemy domyślnego dla regionu (EUNE albo EUW).</p>}
      {err && <div className="lfd-err">{err}</div>}
      {opts && !busy && (
        <div className="ps-choose">
          <p>Jest kilka kont o tym nicku. Wybierz właściwe:</p>
          <div>{opts.map(o => <button type="button" key={`${o.name}#${o.tag}`} className="pill" onClick={() => { setQ(`${o.name}#${o.tag}`); run(`${o.name}#${o.tag}`) }}>{o.name}#{o.tag}<small>{o.tier}</small></button>)}</div>
        </div>
      )}
      {profile && !busy && <Card p={profile} />}
    </div>
  )
}
