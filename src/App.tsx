import { useEffect, useState } from 'react'
import Profile, { MusicBar } from './Profile'
import { register, login as doLogin, getAccount, logout } from './accounts'
const SPL='https://ddragon.leagueoflegends.com/cdn/img/champion/splash/'
export const THEMES = [
  { name:'Cosmic Reaver Kassadin', video:'/themes/kassadin.mp4', img:'Kassadin_5', fx:'swing', bg:'#0b0820', a:'#8b5cf6', b:'#3b82f6', t:'#c4b5fd' },
  { name:'Crime City Twitch', video:'/themes/twitch.mp4', img:'Twitch_4', fx:'sneak', bg:'#1a120b', a:'#b7793f', b:'#7a4a24', t:'#f0c99a' },
  { name:'Gladiator Draven', video:'/themes/draven.mp4', img:'Draven_2', fx:'spin', bg:'#211b12', a:'#e8d3a8', b:'#b8925a', t:'#f6ead0' },
  { name:'Mafia Graves', video:'/themes/graves.mp4', img:'Graves_3', fx:'smoke', bg:'#0e1a1c', a:'#d9a441', b:'#2f6f73', t:'#f3dca6' },
  { name:'Elderwood Hecarim', video:'/themes/hecarim.mp4', img:'Hecarim_5', fx:'gallop', bg:'#08160f', a:'#34d399', b:'#0e7490', t:'#a7f3d0' },
]
import './index.css'
import Guides from './Guides'
import AiHelp from './AiHelp'
import Lfd from './Lfd'
import PlayerSearch from './PlayerSearch'
import Messages, { syncConversations, loadThreads, type Thread } from './Messages'
import UsersDock from './UsersDock'
import Admin from './Admin'
import { api } from './api'
type Screen = 'home' | 'guides' | 'lfd' | 'find' | 'ai' | 'msgs' | 'auth' | 'profile' | 'admin'
const content: Record<'home'|'guides'|'lfd'|'profile', { title: string; text: string }> = {
  home: { title: 'Witaj w Rifted', text: 'Twoje polskie miejsce na Summoner\'s Rift.' },
  guides: { title: 'Poradniki', text: 'Lista gajdów, ranking (lajk/dislike) i kreator buildów — wkrótce.' },
  lfd: { title: 'LFD · Looking For Duo', text: 'Ogłoszenia duo z filtrami (rola, ranga, tryb), cooldown 1 min i filtr treści — wkrótce.' },
  profile: { title: 'Twój profil', text: 'Avatar, ramka, opis, numer konta (#0 = właściciel) i +/− rep. Edycja profilu wkrótce.' },
}
export default function App() {
  const [splash, setSplash] = useState(true)
  const [fade, setFade] = useState(false)
  useEffect(() => { const a = setTimeout(() => setFade(true), 2600); const b = setTimeout(() => setSplash(false), 3000); return () => { clearTimeout(a); clearTimeout(b) } }, [])
  const [s, setS] = useState<Screen>('home')
  const [ti, setTi] = useState(() => { const v = Number(localStorage.getItem('rifted-theme')); return Number.isInteger(v) && v >= 0 && v < THEMES.length ? v : 0 })
  const [pick, setPick] = useState(false)
  useEffect(() => { localStorage.setItem('rifted-theme', String(ti)) }, [ti])
  useEffect(() => { if (!pick) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setPick(false) }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [pick])
  const th = THEMES[ti]
  const [threads, setThreads] = useState<Thread[]>(loadThreads)
  const [chat, setChat] = useState<string | null>(null)
  const unread = threads.reduce((n, t) => n + t.unread, 0)
  const openChat = (nick: string, ico: string, uid: number) => { setThreads(ts => ts.some(t => t.nick === nick) ? ts : [{ nick, ico, uid, msgs: [], unread: 0 }, ...ts]); setChat(nick); setS('msgs') }
  const [user, setUserRaw] = useState<string | null>(() => { const u = localStorage.getItem('rifted-user'); return u && getAccount(u) ? getAccount(u)!.nick : null })
  const setUser = (u: string | null) => { setUserRaw(u); if (u) localStorage.setItem('rifted-user', u); else { localStorage.removeItem('rifted-user'); localStorage.removeItem('rifted-threads'); setThreads(() => []); logout() } }
  useEffect(() => { if (!user) return; let first = true; const go = () => { syncConversations(setThreads, chat, first).catch(() => {}); first = false }; go(); const iv = setInterval(go, 15000); return () => clearInterval(iv) }, [user, chat])
  const [after, setAfter] = useState<Screen>('profile')
  const [who, setWho] = useState<{ id: number; nick: string } | null>(null)
  const GATED: Screen[] = ['lfd','find','ai','msgs','profile','admin']
  useEffect(() => {
    if (!user) return
    const ping = () => { api('/api/presence', { method: 'POST', body: {} }).catch(() => {}) }
    ping()
    const id = setInterval(ping, 25000)
    return () => clearInterval(id)
  }, [user])
  const locked = (k: Screen) => !user && GATED.includes(k)
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [nick, setNick] = useState('')
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState('')
  const login = async (e: React.FormEvent) => { e.preventDefault(); const r = tab==='login' ? await doLogin(nick, pw) : await register(nick, pw, pw2); if (typeof r === 'string') { setErr(r); return } setErr(''); setPw(''); setPw2(''); setNick(''); setUser(r.nick); setS(after); setAfter('profile') }
  return (<>
    {splash && <div className={fade?"splash out":"splash"}><span className="wm wm-splash" aria-label="Rifted"><span className="wm-ring" /><span className="wm-rift" /><span className="wm-txt"><span className="wm-r">R</span><span className="wm-i">ifted</span></span></span></div>}
    <div className="app" style={{"--bg":th.bg,"--a":th.a,"--b":th.b,"--t":th.t} as React.CSSProperties}>
      {s==="home" && <div className="voidbg" aria-hidden>{THEMES.map((t,k)=><div key={t.img} className={k===ti?'vb on':'vb'} style={{backgroundImage:`url(${SPL}${t.img}.jpg)`}} />)}</div>}
      <div className={s==="home"?"kassa home":"kassa"} aria-hidden>{THEMES.map((t,k)=><img key={t.img} className={(k===ti?'on ':'')+'fx-'+t.fx} src={`${SPL}${t.img}.jpg`} alt="" />)}{s==="home" && <video key={'v'+ti} className="idlevid" src={THEMES[ti].video} poster={`${SPL}${THEMES[ti].img}.jpg`} autoPlay muted loop playsInline preload="auto" />}<i className="spark s1"/><i className="spark s2"/><i className="spark s3"/><i className="spark s4"/></div>
      <div className="orb o1" /><div className="orb o2" />
      <header className="top">
        <div className="logo" onClick={() => setS('home')}><span className="wm" aria-label="Rifted"><span className="wm-ring" /><span className="wm-rift" /><span className="wm-txt"><span className="wm-r">R</span><span className="wm-i">ifted</span></span></span></div>
        <nav className="pills">
          {([['home','Home'],['guides','Poradniki'],['lfd','LFD'],['find','Wyszukaj gracza'],['ai','AI pomoc'],['msgs','💬 Wiadomości']] as const).map(([k,l]) => (
            <button key={k} className={s===k?'pill active':'pill'} onClick={() => setS(k)} title={locked(k)?'Wymaga zalogowania':undefined}>{locked(k) && <span className="lockico">🔒</span>}{l}{k==='msgs' && unread>0 && <span className="nbadge">{unread}</span>}</button>
          ))}
        </nav>
        {user
          ? <button className={s==='profile'?'pill cta active':'pill cta'} onClick={() => { setWho(null); setS('profile') }}>Profil · {user}</button>
          : <button className="pill cta" onClick={() => { setAfter('profile'); setTab('login'); setErr(''); setS('auth') }}>Logowanie</button>}
      </header>
      <main className="main">
        {locked(s) ? (
          <div className="glass gate">
            <div className="gate-ico">🔒</div>
            <h2>Ta sekcja jest dla zalogowanych</h2>
            <p>{({lfd:'Szukanie duo (LFD)',find:'Wyszukaj gracza',ai:'AI pomoc',msgs:'Wiadomości',profile:'Profil'} as Record<string,string>)[s]} jest dostępne tylko po zalogowaniu. Jako gość możesz przeglądać Home i Poradniki.</p>
            <div className="gate-btns">
              <button className="pill cta big" onClick={() => { setAfter(s); setTab('login'); setS('auth') }}>Zaloguj się</button>
              <button className="pill big" onClick={() => { setAfter(s); setTab('register'); setS('auth') }}>Załóż konto</button>
            </div>
            <button className="gate-back" onClick={() => setS('guides')}>albo przejdź do Poradników →</button>
          </div>
        ) : s === 'auth' ? (
          <div className="glass auth">
            <div className="tabs">
              <button className={tab==='login'?'active':''} onClick={() => { setTab('login'); setErr('') }}>Logowanie</button>
              <button className={tab==='register'?'active':''} onClick={() => { setTab('register'); setErr('') }}>Rejestracja</button>
            </div>
            <form onSubmit={login}>
              <input placeholder="Nick" value={nick} onChange={e => setNick(e.target.value)} />
              <input placeholder="Hasło" type="password" value={pw} onChange={e => setPw(e.target.value)} />
              {tab==='register' && <input placeholder="Powtórz hasło" type="password" value={pw2} onChange={e => setPw2(e.target.value)} />}
              {err && <div className="auth-err">{err}</div>}
              <button className="pill cta big" type="submit">{tab==='login'?'Zaloguj się':'Załóż konto'}</button>
              <small>Konto zapisuje się lokalnie na tym urządzeniu (bez e-maila).</small>
            </form>
          </div>
        ) : s === 'guides' ? <Guides /> : s === 'ai' ? <AiHelp /> : s === 'find' ? <PlayerSearch /> : s === 'lfd' ? <Lfd onChat={openChat} me={user} /> : s === 'admin' && user ? (user.toLowerCase() === 'kubvss' ? <Admin meId={getAccount(user)?.id ?? 0} /> : <div className="glass"><h2>Brak dostępu</h2><p className="muted">Panel jest tylko dla właściciela.</p></div>) : s === 'profile' && user ? <Profile user={user} view={who} onAdmin={() => setS('admin')} onLogout={() => { setWho(null); setUser(null); setChat(null); setS('home') }} /> : s === 'msgs' ? <Messages threads={threads} setThreads={setThreads} active={chat} setActive={setChat} /> : (
          <div className={s==="home"?"glass hero left":"glass hero"}>
            <h1>{content[s === 'profile' ? 'profile' : 'home'].title}</h1>
            <p>{content[s === 'profile' ? 'profile' : 'home'].text}</p>
            {s === 'profile' && user && <>
              <div className="avatar">{user[0].toUpperCase()}</div>
              <p className="muted">{user} · konto #{getAccount(user)?.id ?? 1}</p>
              <button className="pill" onClick={() => { setUser(null); setChat(null); setS('home') }}>Wyloguj</button>
            </>}
            {s === 'home' && <>
              <div className="hm-tag">✦ Tworzymy nowe polskie community League of Legends</div>
              <div className="hm-grid">
                <button className="hm-card" onClick={() => setS('lfd')}><b>🤝 Szukanie duo</b><span>Ogłoszenia LFD z filtrem roli, rangi i trybu. Znajdź partnera na ranked w minutę.</span></button>
                <button className="hm-card" onClick={() => setS('guides')}><b>📘 Poradniki i buildy</b><span>Wszyscy championi, buildy pod rangę. Start, pierwszy back, skill order.</span></button>
                <button className="hm-card" onClick={() => setS('guides')}><b>📊 Tier lista z patcha</b><span>Win rate, pick rate i tier S–D aktualizowane po każdym patchu.</span></button>
                <button className="hm-card" onClick={() => { setWho(null); setS(user?'profile':'auth') }}><b>👤 Profil gracza</b><span>Avatar, ramka, opis i reputacja +/−. Pokaż, z kim warto grać.</span></button>
              </div>
              <div className="hm-note"><b>Cześć! 👋</b><p>Rifted to projekt, który tworzę na studia — z pomocą AI. Wszystko utrzymuję i opłacam sam, więc będzie mi bardzo miło, jeśli zostaniesz i będziesz z niego korzystać. Mam nadzieję, że projekt będzie się rozwijał i zostanie z nami na długo. 💜</p></div>
              <div className="hm-stats"><div><b>EUNE · EUW</b><span>serwery</span></div></div>
              <p className="muted hm-theme">Motyw: {th.name}</p>
            </>}
            {s !== 'profile' && s !== 'home' && <div className="bubble">Ekran w budowie ✦</div>}
          </div>
        )}
      </main>
      {user && <MusicBar user={user} />}
      {user && <UsersDock me={user} onOpen={u => { setWho(u); setS('profile') }} />}
      <footer className="app-foot"><span><b>Kontakt</b> — <a href="mailto:czystekontorazdwa12@gmail.com">czystekontorazdwa12@gmail.com</a></span><span className="af-sep">·</span><span>© 2026 <b>kubvss</b>. Wszelkie prawa zastrzeżone. Kopiowanie bez zgody autora zabronione.</span></footer>
      <div className="themebox">
        {pick && <><div className="themeveil" onClick={() => setPick(false)} />
        <div className="themepick glass" role="listbox">
          <div className="tp-h">Wybierz motyw</div>
          {THEMES.map((t,k)=>(
            <button key={t.img} className={k===ti?'tp-i on':'tp-i'} onClick={() => { setTi(k); setPick(false) }} style={{"--a":t.a} as React.CSSProperties}>
              <img src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${t.img}.jpg`} alt="" />
              <span>{t.name}</span>{k===ti && <b>✓</b>}
            </button>))}
        </div></>}
        <button className="themebtn" onClick={() => setPick(p=>!p)}>⚙ Motyw</button>
      </div>
    </div>
  </>)
}
