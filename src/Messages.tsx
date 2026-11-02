import { isOnline, avatar } from './presence'
import { useEffect, useRef, useState } from 'react'
import { api } from './api'
export type Msg = { me: boolean; txt: string; t: number }
export type Thread = { nick: string; ico: string; uid: number; msgs: Msg[]; unread: number; lastAt?: string; prev?: { txt: string; me: boolean } }
type Conv = { user_id: number; username: string; last_text: string; last_at: string; last_from_me: boolean }
// Pobiera listę rozmów z serwera i scala z lokalną listą (nowe rozmowy od innych pojawiają się automatycznie)
export async function syncConversations(setThreads: (f: (t: Thread[]) => Thread[]) => void, active: string | null, first: boolean) {
  const { conversations: cs } = await api<{ conversations: Conv[] }>('/api/conversations')
  setThreads(ts => {
    const out = cs.map(c => {
      const old = ts.find(t => t.uid === c.user_id || t.nick === c.username)
      const fresh = !first && !c.last_from_me && c.username !== active && (old ? old.lastAt !== c.last_at : true)
      return { nick: c.username, ico: old?.ico || '💬', uid: c.user_id, msgs: old?.msgs || [], unread: (old?.unread || 0) + (fresh ? 1 : 0), lastAt: c.last_at, prev: { txt: c.last_text, me: c.last_from_me } }
    })
    // rozmowy otwarte z LFD, w których nikt jeszcze nic nie napisał
    return [...ts.filter(t => !out.some(o => o.uid === t.uid)), ...out]
  })
}
// Lista kontaktów (tylko nick/id, bez treści) — treść rozmów zawsze z serwera
const TK = 'rifted-threads'
export const loadThreads = (): Thread[] => { try { return (JSON.parse(localStorage.getItem(TK) || '[]') as Thread[]).filter(t => t.uid).map(t => ({ nick: t.nick, ico: t.ico, uid: t.uid, msgs: [], unread: 0 })) } catch { return [] } }
const myId = (): number => { try { return JSON.parse(localStorage.getItem('rifted-me') || 'null')?.id ?? 0 } catch { return 0 } }
type Row = { id: number; from_id: number; to_id: number; text: string; created_at: string }
const toMsg = (r: Row, me: number): Msg => ({ me: r.from_id === me, txt: r.text, t: Date.parse(r.created_at.replace(' ', 'T') + 'Z') })
const hm = (t: number) => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
export default function Messages({ threads, setThreads, active, setActive }: { threads: Thread[]; setThreads: (f: (t: Thread[]) => Thread[]) => void; active: string | null; setActive: (n: string) => void }) {
  const [txt, setTxt] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const cur = threads.find(t => t.nick === active) ?? null
  useEffect(() => { localStorage.setItem(TK, JSON.stringify(threads.map(t => ({ nick: t.nick, ico: t.ico, uid: t.uid })))) }, [threads.length])
  const load = async (t: Thread) => {
    try { const r = await api<{ messages: Row[] }>(`/api/messages/${t.uid}`); const me = myId(); setThreads(ts => ts.map(x => x.nick === t.nick ? { ...x, msgs: r.messages.map(m => toMsg(m, me)) } : x)); setErr('') }
    catch (x) { setErr((x as Error).message) }
  }
  useEffect(() => { if (!cur) return; load(cur); const iv = setInterval(() => load(cur), 5000); return () => clearInterval(iv) }, [active])
  useEffect(() => { if (cur?.unread) setThreads(ts => ts.map(t => t.nick === cur.nick ? { ...t, unread: 0 } : t)) }, [active, cur?.unread])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [cur?.msgs.length])
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); const v = txt.trim(); if (!v || !cur || busy) return
    setBusy(true)
    try { await api(`/api/messages/${cur.uid}`, { method: 'POST', body: { text: v } }); setTxt(''); await load(cur) }
    catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="msgs">
      <div className="glass msg-side">
        <h2>💬 Wiadomości</h2>
        {threads.length === 0 && <p className="muted">Brak rozmów. Napisz do kogoś z LFD.</p>}
        {threads.map(t => { const last = t.msgs[t.msgs.length - 1] ?? (t.prev && { me: t.prev.me, txt: t.prev.txt }); return (
          <button key={t.nick} className={`msg-th${t.nick === active ? ' on' : ''}`} onClick={() => setActive(t.nick)}>
            <span className="lfd-av av-wrap"><img className="av-img" src={avatar(t.nick)} alt={t.nick} /><i className={`dot ${isOnline(t.nick) ? 'on' : 'off'}`} /></span>
            <span className="msg-thb"><b>{t.nick}</b><small>{last ? (last.me ? 'Ty: ' : '') + last.txt : 'Nowa rozmowa'}</small></span>
            {t.unread > 0 && <span className="nbadge">{t.unread}</span>}
          </button>) })}
      </div>
      <div className="glass msg-chat">
        {!cur ? <p className="muted msg-empty">Wybierz rozmowę z listy ✦</p> : <>
          <div className="msg-h"><span className="lfd-av av-wrap"><img className="av-img" src={avatar(cur.nick)} alt={cur.nick} /><i className={`dot ${isOnline(cur.nick) ? 'on' : 'off'}`} /></span><b>{cur.nick}</b><span className={`msg-on ${isOnline(cur.nick) ? '' : 'off'}`}>{isOnline(cur.nick) ? 'Aktywny' : 'Nieaktywny'}</span></div>
          <div className="msg-body">
            {cur.msgs.length === 0 && !err && <p className="muted msg-empty">Przywitaj się z {cur.nick} 👋</p>}
            {cur.msgs.map((m, i) => { const n = m.me ? 'Ty' : cur.nick; return <div key={i} className={`brow${m.me ? ' me' : ''}`}><span className="lfd-av av-wrap av-sm"><img className="av-img" src={avatar(n)} alt={n} /><i className={`dot ${isOnline(n) ? 'on' : 'off'}`} /></span><div className="bcol"><span className="bnick">{n}</span><div className={`bub${m.me ? ' me' : ''}`}>{m.txt}<small>{hm(m.t)}</small></div></div></div> })}
            <div ref={end} />
          </div>
          <form className="msg-in" onSubmit={send}><input placeholder={`Napisz do ${cur.nick}…`} value={txt} onChange={e => setTxt(e.target.value)} maxLength={300} /><button className="pill cta" disabled={busy}>{busy ? 'Wysyłam…' : 'Wyślij'}</button></form>
          {err && <p className="muted" style={{ color: '#f87171', margin: '6px 0 0' }}>{err}</p>}
        </>}
      </div>
    </div>)
}
