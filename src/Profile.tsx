import { useEffect, useRef, useState } from 'react'
import { getAccount } from './accounts'
import { api } from './api'
const ROLE = ['Wszystko', 'Top', 'Jungle', 'Mid', 'ADC', 'Support']
const RANGI = ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master+']
const FRAMES = [['void', 'Void'], ['gold', 'Złota'], ['neon', 'Neon'], ['none', 'Brak']] as const
const CHAMPS = ['Ahri', 'Kassadin', 'Yasuo', 'Jinx', 'LeeSin', 'Thresh', 'Darius', 'Lux', 'Ezreal', 'Zed', 'Kaisa', 'Teemo', 'Akali', 'Vayne', 'Garen', 'Jhin']
const ico = (c: string) => c.startsWith('data:') ? c : icoD(c)
const icoD = (c: string) => `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${c}.png`
type P = { bio: string; rola: string; ranga: string; frame: string; champ: string; plus: number; minus: number; banner: string; music: string }
const DEF: P = { bio: '', rola: 'Wszystko', ranga: 'Unranked', frame: 'void', champ: '', plus: 0, minus: 0, banner: '', music: '' }
type Rep = { plus: number; minus: number; mine: number }
const KEY = (n: string) => 'rifted-profile-' + n.toLowerCase()
const load = (n: string): P => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY(n)) || '{}') } } catch { return DEF } }
const Chips = ({ opts, val, set }: { opts: readonly (readonly [string, string])[]; val: string; set: (v: string) => void }) =>
  <div className="chips">{opts.map(([k, l]) => <button type="button" key={k} className={'chip' + (val === k ? ' on' : '') + (opts === FR ? ' fr-chip fr-' + k : '')} onClick={() => set(k)}>{l}</button>)}</div>
const FR = FRAMES
export const parseMusic = (u: string): { kind: 'yt' | 'sp'; src: string } | null => {
  const y = u.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); if (y) return { kind: 'yt', src: `https://www.youtube.com/embed/${y[1]}?enablejsapi=1&autoplay=1&loop=1&playlist=${y[1]}` }
  const sp = u.match(/open\.spotify\.com\/(?:intl-\w+\/)?(track|album|playlist|episode)\/(\w+)/); if (sp) return { kind: 'sp', src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}` }
  return null
}
export function MusicBar({ user }: { user: string }) {
  const [m, setM] = useState(() => load(user).music)
  const [vol, setVol] = useState(() => Number(localStorage.getItem('rifted-vol') ?? 50))
    const ref = useRef<HTMLIFrameElement>(null)
  const [hid, setHid] = useState(false)
  useEffect(() => { const h = () => setM(load(user).music); const v = (e: Event) => setHid(!!(e as CustomEvent).detail); window.addEventListener('rifted-profile', h); window.addEventListener('rifted-viewas', v); setM(load(user).music); return () => { window.removeEventListener('rifted-profile', h); window.removeEventListener('rifted-viewas', v) } }, [user])
  const cmd = (func: string, args: unknown[] = []) => ref.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
  useEffect(() => { localStorage.setItem('rifted-vol', String(vol)); cmd('setVolume', [vol]) }, [vol])
  const [title, setTitle] = useState('')
  useEffect(() => { setTitle(''); if (!m) return; fetch('https://noembed.com/embed?url=' + encodeURIComponent(m)).then(r => r.json()).then(j => j.title && setTitle(j.title)).catch(() => {}) }, [m])
  const mu = parseMusic(m); if (!mu || hid) return null
  return <div className="musicbar glass" title={title || 'Muzyka profilu'}>
    <iframe ref={ref} src={mu.src} title="Muzyka" allow="autoplay; encrypted-media" onLoad={() => setTimeout(() => { cmd('playVideo'); cmd('setVolume', [vol]) }, 800)} className={mu.kind} />
    <span className={'mb-ico ' + mu.kind}>🎵</span>
    <span className="mb-name">{title || (mu.kind === 'yt' ? 'YouTube' : 'Spotify')}</span>
    {mu.kind === 'yt' && <label className="mb-vol" title="Głośność">{vol ? '🔊' : '🔈'}<input type="range" min={0} max={100} value={vol} onChange={e => setVol(+e.target.value)} /></label>}
  </div>
}
export function ProfileMusic({ music }: { music: string }) {
  const mu = parseMusic(music)
  const [vol, setVol] = useState(() => Number(localStorage.getItem('rifted-vol') ?? 50))
  const ref = useRef<HTMLIFrameElement>(null)
  const cmd = (func: string, args: unknown[] = []) => ref.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
  useEffect(() => { localStorage.setItem('rifted-vol', String(vol)); cmd('setVolume', [vol]) }, [vol])
  if (!mu) return null
  return <div className="pm-card">
    <div className="pm-head"><span className="pm-eq"><i /><i /><i /><i /></span><b>Teraz gra na profilu</b><small className="muted">{mu.kind === 'yt' ? 'YouTube' : 'Spotify'} · leci w tle</small></div>
    <iframe ref={ref} src={mu.src} title="Muzyka profilu" allow="autoplay; encrypted-media" className={mu.kind} onLoad={() => setTimeout(() => { cmd('playVideo'); cmd('setVolume', [vol]) }, 800)} />
    {mu.kind === 'yt' ? <label className="pm-vol">🔉<input type="range" min={0} max={100} value={vol} onChange={e => setVol(+e.target.value)} />🔊<small>{vol}%</small></label> : <small className="muted">Głośność ustawisz w odtwarzaczu Spotify</small>}
  </div>
}
export default function Profile({ user, onLogout, view, onAdmin }: { user: string; onLogout: () => void; view?: { id: number; nick: string } | null; onAdmin?: () => void }) {
  const acc = getAccount(user)
  const other = !!(view && view.nick.toLowerCase() !== user.toLowerCase())
  const repId = other ? view!.id : acc?.id
  const [srv, setSrv] = useState<Rep | null>(null)
  const [repErr, setRepErr] = useState('')
  const [repBusy, setRepBusy] = useState(false)
  useEffect(() => {
    if (!repId) return
    let alive = true
    setSrv(null); setRepErr('')
    api<Rep>(`/api/users/${repId}/rep`).then(r => { if (alive) setSrv(r) }).catch(e => { if (alive) setRepErr((e as Error).message) })
    return () => { alive = false }
  }, [repId])
  const vote = async (value: 1 | -1) => {
    if (!repId || !other) return
    setRepBusy(true)
    try { setSrv(await api<Rep>(`/api/users/${repId}/rep`, { method: 'POST', body: { value } })); setRepErr('') }
    catch (e) { setRepErr((e as Error).message) }
    setRepBusy(false)
  }
  const [p, setP] = useState<P>(() => load(user))
  const [edit, setEdit] = useState(false)
  const [d, setD] = useState<P>(p)
  const [toast, setToast] = useState(false)
  const v = edit ? d : p
  const dirty = JSON.stringify(d) !== JSON.stringify(p)
  const save = () => { const n = { ...d, bio: d.bio.trim().slice(0, 200) }; setP(n); localStorage.setItem(KEY(user), JSON.stringify(n)); window.dispatchEvent(new Event('rifted-profile')); setEdit(false); setToast(true); setTimeout(() => setToast(false), 2200) }
  const plus = srv?.plus ?? 0
  const minus = srv?.minus ?? 0
  const score = plus - minus
  const [preview, setPreview] = useState(false)
  const shrink = (f: File, w: number, h: number, cb: (u: string) => void) => { if (!f.type.startsWith('image/')) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const sc = Math.max(w / im.width, h / im.height); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; const dw = im.width * sc, dh = im.height * sc; x.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh); cb(c.toDataURL('image/jpeg', 0.85)) }; im.src = String(r.result) }; r.readAsDataURL(f) }
  const onFile = (f?: File) => { if (f) shrink(f, 1200, 300, banner => setD(o => ({ ...o, banner }))) }
  const onAv = (f?: File) => { if (f) shrink(f, 256, 256, champ => setD(o => ({ ...o, champ }))) }
  const mu = parseMusic(v.music)
  useEffect(() => { window.dispatchEvent(new CustomEvent('rifted-viewas', { detail: preview })); return () => { window.dispatchEvent(new CustomEvent('rifted-viewas', { detail: false })) } }, [preview])
  if (other && view) {
    return (
      <div className="glass prof other-prof">
        <div className="prof-head">
          <div className="prof-av fr-void"><span>{view.nick[0]?.toUpperCase() || '?'}</span></div>
          <div>
            <h1>{view.nick} <span className="prof-num">#{view.id}</span></h1>
            <div className="prof-tags"><span className={score >= 0 ? 'rep pos' : 'rep neg'}>Rep {score >= 0 ? '+' : ''}{score}</span></div>
            <small className="muted">Profil gracza</small>
          </div>
        </div>
        <div className="prof-rep"><span>👍 {plus}</span><span>👎 {minus}</span>{repErr && <small className="muted">{repErr}</small>}</div>
        <div className="prof-btns">
          <button className={'pill' + (srv?.mine === 1 ? ' cta' : '')} disabled={repBusy} onClick={() => vote(1)}>👍 Poleć</button>
          <button className={'pill' + (srv?.mine === -1 ? ' cta' : '')} disabled={repBusy} onClick={() => vote(-1)}>👎 Zgłoś</button>
        </div>
      </div>
    )
  }
  return (
    <div className="glass prof">
      {preview && <div className="prof-viewas" style={{position:'relative',zIndex:2}}>👁 Tak widzą Twój profil inni gracze <button className="pill" onClick={() => setPreview(false)}>Wróć do mojego widoku</button></div>}
      <div className="prof-banner" style={v.banner ? { backgroundImage: `url("${v.banner}")` } : undefined} />
      {toast && <div className="prof-toast">✓ Profil zapisany</div>}
      <div className="prof-head">
        <div className={'prof-av fr-' + v.frame}>{v.champ ? <img src={ico(v.champ)} alt={v.champ} /> : <span>{user[0].toUpperCase()}</span>}</div>
        <div>
          <h1>{user} <span className="prof-num">#{acc?.id ?? 0}</span></h1>
          <div className="prof-tags"><span>{v.rola}</span><span>{v.ranga}</span><span className={score >= 0 ? 'rep pos' : 'rep neg'}>Rep {score >= 0 ? '+' : ''}{score}</span></div>
          {preview ? <small className="muted"><span style={{display:'inline-block',width:8,height:8,borderRadius:9,background:'#3ad07a',marginRight:6}} />Aktywny teraz</small> : <small className="muted">{edit ? 'Podgląd na żywo' : 'Konto od ' + new Date(acc?.created ?? Date.now()).toLocaleDateString('pl-PL')}</small>}
        </div>
      </div>
      {!edit ? <>
        <p className="prof-bio">{p.bio || (preview ? 'Ten gracz nie dodał jeszcze opisu.' : 'Brak opisu — dodaj coś o sobie.')}</p>
        {preview && <ProfileMusic music={p.music} />}
        {mu && !preview && <div className="prof-music">🎵 Ulubiona muzyka: <b>{mu.kind === 'yt' ? 'YouTube' : 'Spotify'}</b> <small className="muted">— gra w tle (odtwarzacz w prawym dolnym rogu)</small></div>}
        <div className="prof-rep"><span>👍 {plus}</span><span>👎 {minus}</span>{!preview && <small className="muted">Reputację wystawiają inni gracze.</small>}{repErr && <small className="muted">{repErr}</small>}</div>
        {preview ? <div className="prof-btns"><button className="pill cta" disabled title="Podgląd">💬 Czat</button><button className="pill" disabled>👍 Poleć</button><button className="pill" disabled>👎 Zgłoś</button></div> : <div className="prof-btns">{user.toLowerCase() === 'kubvss' && onAdmin && <button className="pill cta" onClick={onAdmin}>Panel właściciela</button>}<button className="pill" onClick={() => setPreview(true)}>👁 Zobacz jako inny gracz</button><button className="pill cta" onClick={() => { setD(p); setEdit(true) }}>✏️ Edytuj profil</button><button className="pill" onClick={onLogout}>Wyloguj</button></div>}
      </> : <div className="prof-form">
        <label>Opis <small className="muted cnt">{d.bio.length}/200</small><textarea maxLength={200} value={d.bio} onChange={e => setD({ ...d, bio: e.target.value })} placeholder="Np. main Kassadin, gram wieczorami…" /></label>
        <div className="lbl">Baner profilu</div>
        <div className="prof-row"><input className="prof-in" placeholder="Link do obrazka (https://…)" value={d.banner.startsWith('data:') ? '' : d.banner} onChange={e => setD({ ...d, banner: e.target.value.trim() })} /><label className="pill file">📁 Wgraj z komputera<input type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} /></label>{d.banner && <button type="button" className="pill" onClick={() => setD({ ...d, banner: '' })}>Usuń</button>}</div>
        <div className="lbl">Ulubiona muzyka (YouTube / Spotify)</div>
        <input className="prof-in" placeholder="https://youtu.be/… lub https://open.spotify.com/track/…" value={d.music} onChange={e => setD({ ...d, music: e.target.value.trim() })} />
        {d.music && <small className={parseMusic(d.music) ? 'ok-hint' : 'err-hint'}>{parseMusic(d.music) ? '✓ Rozpoznano: ' + (parseMusic(d.music)!.kind === 'yt' ? 'YouTube' : 'Spotify') + ' — po zapisie zagra w tle' : 'Nieobsługiwany link'}</small>}
        <div className="lbl">Avatar</div>
        <div className="prof-row"><label className="pill file">📁 Wgraj własne zdjęcie<input type="file" accept="image/*" hidden onChange={e => onAv(e.target.files?.[0])} /></label>{d.champ.startsWith('data:') && <><img src={d.champ} alt="" style={{width:40,height:40,borderRadius:10,objectFit:'cover'}} /><button type="button" className="pill" onClick={() => setD({ ...d, champ: '' })}>Usuń</button></>}<small className="muted">albo wybierz championa:</small></div>
        <div className="champ-grid">
          <button type="button" className={'champ' + (!d.champ ? ' on' : '')} onClick={() => setD({ ...d, champ: '' })}><span>{user[0].toUpperCase()}</span></button>
          {CHAMPS.map(c => <button type="button" key={c} title={c} className={'champ' + (d.champ === c ? ' on' : '')} onClick={() => setD({ ...d, champ: c })}><img src={ico(c)} alt={c} /></button>)}
        </div>
        <div className="lbl">Rola</div><Chips opts={ROLE.map(r => [r, r] as const)} val={d.rola} set={rola => setD({ ...d, rola })} />
        <div className="lbl">Ranga</div><Chips opts={RANGI.map(r => [r, r] as const)} val={d.ranga} set={ranga => setD({ ...d, ranga })} />
        <div className="lbl">Ramka</div><Chips opts={FR} val={d.frame} set={frame => setD({ ...d, frame })} />
        <div className="prof-btns"><button className="pill cta" disabled={!dirty} onClick={save}>Zapisz</button><button className="pill" onClick={() => setEdit(false)}>Anuluj</button></div>
      </div>}
    </div>
  )
}
