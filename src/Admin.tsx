import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

type User = { id: number; username: string; created_at?: string }
type Post = { id: number; user_id: number; username: string; role?: string | null; rank?: string | null; text: string; created_at?: string }
type Overview = { users?: User[]; lfd?: { posts?: number }; messages?: { count?: number }; rep?: { plus?: number; minus?: number } }

const when = (s?: string) => {
  if (!s) return '—'
  const t = Date.parse(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  if (!Number.isFinite(t)) return s
  return new Date(t).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Admin({ meId }: { meId: number }) {
  const [ov, setOv] = useState<Overview | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const load = useCallback(() => {
    setErr('')
    Promise.all([
      api<Overview>('/api/admin/overview'),
      api<{ posts?: Post[] }>('/api/admin/lfd'),
    ]).then(([o, l]) => { setOv(o); setPosts(l.posts || []) }).catch(e => setErr((e as Error).message || 'Nie udało się pobrać panelu.'))
  }, [])
  useEffect(() => { load() }, [load])
  const users = ov?.users || []
  const delUser = async (u: User) => {
    if (u.id === meId) return
    if (!confirm(`Usunąć konto ${u.username}?`)) return
    setBusy('u' + u.id)
    try { await api('/api/admin/users/' + u.id, { method: 'DELETE' }); load() } catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const delPost = async (p: Post) => {
    if (!confirm('Usunąć to ogłoszenie?')) return
    setBusy('p' + p.id)
    try { await api('/api/admin/lfd/' + p.id, { method: 'DELETE' }); load() } catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const plus = ov?.rep?.plus ?? 0
  const minus = ov?.rep?.minus ?? 0
  return (
    <div className="glass admin">
      <h1>Panel właściciela</h1>
      <p className="muted">Konta, ogłoszenia i reputacja. Widoczne tylko dla kubvss.</p>
      {err && <p className="admin-err">{err}</p>}
      <div className="admin-stats">
        <div><b>{users.length}</b><span>Użytkownicy</span></div>
        <div><b>{ov?.lfd?.posts ?? '…'}</b><span>Ogłoszenia LFD</span></div>
        <div><b>{ov?.messages?.count ?? '…'}</b><span>Wiadomości</span></div>
        <div><b>+{plus} / −{minus}</b><span>Reputacja</span></div>
      </div>
      <h3>Użytkownicy</h3>
      {!users.length && <p className="muted">Ładowanie…</p>}
      <div className="admin-list">
        {users.map(u => (
          <div key={u.id} className="admin-row">
            <div><b>{u.username}</b> <small className="muted">#{u.id}</small>{u.username.toLowerCase() === 'kubvss' && <em>Właściciel</em>}<br /><small className="muted">Rejestracja: {when(u.created_at)}</small></div>
            {u.id !== meId && <button className="pill" disabled={busy === 'u' + u.id} onClick={() => delUser(u)}>Usuń</button>}
          </div>
        ))}
      </div>
      <h3>Ogłoszenia LFD</h3>
      {!posts.length && <p className="muted">Brak ogłoszeń.</p>}
      <div className="admin-list">
        {posts.map(p => (
          <div key={p.id} className="admin-row">
            <div><b>{p.username}</b> <small className="muted">{[p.role, p.rank].filter(Boolean).join(' · ')} · {when(p.created_at)}</small><p>{p.text}</p></div>
            <button className="pill" disabled={busy === 'p' + p.id} onClick={() => delPost(p)}>Usuń</button>
          </div>
        ))}
      </div>
    </div>
  )
}
