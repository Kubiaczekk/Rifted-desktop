import { isOnline, avatar } from './presence'
import { useEffect, useState } from 'react'
import { api } from './api'
import PlayerSearch from './PlayerSearch'
type Post = { id: number; uid: number; nick: string; rola: string; szuka: string; ranga: string; tryb: string; smurf?: boolean; txt: string; t: number }
const ROLE = ['Top', 'Jungle', 'Mid', 'ADC', 'Support']
const RANGI = ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master+']
const TRYBY = ['Solo/Duo', 'Flex', 'Draft', 'Normal', 'ARAM', 'Arena']
const ICO: Record<string, string> = { Top: '🛡️', Jungle: '🌲', Mid: '✨', ADC: '🏹', Support: '💚' }
const BAN = /(kurw|chuj|pierdol|jeb|debil|idiot|cwel|spierd|n[i1]gg|discord\.gg|http)/i
const ago = (t: number) => { const m = Math.floor((Date.now() - t) / 60e3); return m < 1 ? 'teraz' : m < 60 ? `${m} min temu` : `${Math.floor(m / 60)} h temu` }
const Sel = ({ v, set, opts, all }: { v: string; set: (s: string) => void; opts: string[]; all?: string }) =>
  <select value={v} onChange={e => set(e.target.value)}>{all && <option value="">{all}</option>}{opts.map(o => <option key={o}>{o}</option>)}</select>
type Row = { id: number; user_id: number; username: string; role: string; rank: string; text: string; extra: string | null; created_at: string }
const toPost = (r: Row): Post => { let x: any = {}; try { x = JSON.parse(r.extra || '{}') } catch {} return { id: r.id, uid: r.user_id, nick: r.username, rola: r.role || 'Wszystko', ranga: r.rank || 'Unranked', szuka: x.szuka || 'Wszystko', tryb: x.tryb || 'Normal', smurf: !!x.smurf, txt: r.text, t: Date.parse(r.created_at.replace(' ', 'T') + 'Z') } }
export default function Lfd({ onChat, me }: { onChat: (nick: string, ico: string, uid: number) => void; me: string | null }) {
  const [posts, setPosts] = useState<Post[]>([])
  const reload = () => api<{ posts: Row[] }>('/api/lfd').then(r => setPosts(r.posts.map(toPost))).catch(e => setErr(e.message))
  useEffect(() => { reload(); const id = setInterval(reload, 10000); return () => clearInterval(id) }, [])
  const [fr, setFr] = useState(''); const [fg, setFg] = useState(''); const [ft, setFt] = useState(''); const [q, setQ] = useState('')
  const [f, setF] = useState({ rola: 'Mid', szuka: 'Jungle', ranga: 'Gold', tryb: 'Solo/Duo', smurf: false, txt: '' })
  const [cd, setCd] = useState(0); const [err, setErr] = useState(''); const [, tick] = useState(0)
  const [seek, setSeek] = useState(false)
  useEffect(() => { const id = setInterval(() => { tick(x => x + 1); setCd(c => Math.max(0, c - 1)) }, 1000); return () => clearInterval(id) }, [])
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    if (cd > 0) return setErr(`Poczekaj ${cd} s przed kolejnym ogłoszeniem.`)
    if (f.txt.trim().length < 5) return setErr('Opis musi mieć min. 5 znaków.')
    if (BAN.test(f.txt)) return setErr('🛡️ Filtr treści: ogłoszenie zawiera niedozwolone słowa lub linki.')
    try { await api('/api/lfd', { method: 'POST', body: { role: f.rola, rank: f.ranga, text: f.txt.trim(), extra: { szuka: f.szuka, tryb: f.tryb, smurf: f.smurf } } }) } catch (x) { return setErr((x as Error).message) }
    setF({ ...f, txt: '' }); setCd(60); reload()
  }
  const list = posts.filter(p => Date.now() - p.t < 30 * 60e3 && (!fr || p.rola === fr) && (!fg || p.ranga === fg) && (!ft || p.tryb === ft) && (!q || (q === 'smurf' ? p.smurf : p.tryb === q)))
  return (
    <div className="lfd">
      <div className="glass lfd-form">
        <div className="lfd-h"><h2>🤝 Dodaj ogłoszenie</h2><span className="aih-badge">🛡️ Filtr treści</span></div>
        <form onSubmit={add}>
          <label>Twoja rola<Sel v={f.rola} set={v => setF({ ...f, rola: v })} opts={[...ROLE, 'Wszystko']} /></label>
          <label>Szukam<Sel v={f.szuka} set={v => setF({ ...f, szuka: v })} opts={[...ROLE, 'Wszystko']} /></label>
          <label>Ranga<Sel v={f.ranga} set={v => setF({ ...f, ranga: v })} opts={RANGI} /></label>
          <label>Tryb<Sel v={f.tryb} set={v => setF({ ...f, tryb: v })} opts={TRYBY} /></label>
          <label className="lfd-chk"><input type="checkbox" checked={f.smurf} onChange={e => setF({ ...f, smurf: e.target.checked })} /> Konto smurf</label>
          <textarea maxLength={160} placeholder="Np. Gram Dravena, szukam agresywnego supporta, mic ok…" value={f.txt} onChange={e => setF({ ...f, txt: e.target.value })} />
          <small className="muted">{f.txt.length}/160</small>
          {err && <div className="lfd-err">{err}</div>}
          <button className="pill cta" disabled={cd > 0}>{cd > 0 ? `⏳ Cooldown ${cd} s` : 'Opublikuj ogłoszenie'}</button>
          {cd > 0 && <div className="lfd-cd"><i style={{ width: `${(cd / 60) * 100}%` }} /></div>}
        </form>
      </div>
      <div className="glass lfd-list">
        <div className="lfd-h"><h2>Szukam duo</h2><span className="muted">{(() => { const n = list.length; const m = n % 10, t = n % 100; if (n === 1) return '1 ogłoszenie'; if (m >= 2 && m <= 4 && !(t >= 12 && t <= 14)) return `${n} ogłoszenia`; return `${n} ogłoszeń` })()}</span></div>
        <button type="button" className={seek ? 'lfd-search-tile on' : 'lfd-search-tile'} aria-expanded={seek} onClick={() => setSeek(v => !v)}>
          <b>🔍 Wyszukaj gracza</b>
          <span>Nick Riot, ranga i ostatnie gry z DeepLOL.</span>
        </button>
        {seek ? <PlayerSearch onClose={() => setSeek(false)} /> : <>
        <div className="lfd-q">{[['', 'Wszystkie'], ['smurf', '🕶️ Tylko smurfy'], ['Solo/Duo', 'Solo/Duo ranked'], ['Flex', 'Flex'], ['Draft', 'Draft']].map(([k, l]) => <button key={k} className={`lfd-chip${q === k ? ' on' : ''}`} onClick={() => setQ(k)}>{l}</button>)}</div>
        <div className="lfd-fil"><Sel v={fr} set={setFr} opts={ROLE} all="Każda rola" /><Sel v={fg} set={setFg} opts={RANGI} all="Każda ranga" /><Sel v={ft} set={setFt} opts={TRYBY} all="Każdy tryb" /></div>
        <div className="lfd-items">
          {list.length === 0 && <p className="muted">Brak ogłoszeń dla tych filtrów.</p>}
          {list.map(p => <div key={p.id} className="lfd-card">
            <div className="lfd-av av-wrap" title={isOnline(p.nick) ? 'Aktywny' : 'Nieaktywny'}><img className="av-img" src={avatar(p.nick)} alt={p.nick} /><span className="av-role">{ICO[p.rola]}</span><i className={`dot ${isOnline(p.nick) ? 'on' : 'off'}`} /></div>
            <div className="lfd-b">
              <div className="lfd-top"><b>{p.nick}</b><span className={`lfd-rank r-${p.ranga.replace('+', '')}`}>{p.ranga}</span><span className="lfd-tag">{p.tryb}</span>{p.smurf && <span className="lfd-tag lfd-smurf">🕶️ Smurf</span>}<span className="muted lfd-t">{ago(p.t)}</span></div>
              <div className="lfd-roles">{p.rola} → szuka: <b>{p.szuka}</b></div>
              <p>{p.txt}</p>
            </div>
            {p.nick !== me && <button className="pill chatbtn" onClick={() => onChat(p.nick, ICO[p.rola], p.uid)}>💬 Czat</button>}
          </div>)}
        </div>
        </>}
      </div>
    </div>)
}
