import { useEffect, useState } from 'react'
import { api } from './api'
import { isOnline } from './presence'

type Row = { id: number; username: string; online?: boolean; last_seen?: string | null; is_owner?: boolean }

function live(u: Row, me: string) {
  return !!(u.online || isOnline(u.username) || u.username.toLowerCase() === me.toLowerCase())
}
function rank(u: Row, me: string) {
  if (u.is_owner || u.username.toLowerCase() === 'kubvss') return 0
  return live(u, me) ? 1 : 2
}

export default function UsersDock({ me, onOpen }: { me: string; onOpen: (u: { id: number; nick: string }) => void }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    let alive = true
    const load = () => {
      setBusy(true)
      api<{ users?: Row[] }>('/api/users')
        .then(r => {
          if (!alive) return
          const list = (r.users || []).slice().sort((a, b) => rank(a, me) - rank(b, me) || a.username.localeCompare(b.username, 'pl'))
          setRows(list)
          setErr('')
        })
        .catch(e => { if (alive) setErr((e as Error).message || 'Nie udało się pobrać listy.') })
        .finally(() => { if (alive) setBusy(false) })
    }
    load()
    const id = setInterval(load, 20000)
    return () => { alive = false; clearInterval(id) }
  }, [open, me])
  return (
    <div className="users-dock">
      {open && (
        <div className="users-panel glass" role="dialog" aria-label="Użytkownicy">
          <div className="users-h"><b>Użytkownicy</b><button className="pill" onClick={() => setOpen(false)} aria-label="Zamknij">✕</button></div>
          {busy && !rows.length && <p className="muted">Ładowanie…</p>}
          {err && <p className="muted">{err}</p>}
          {!err && !busy && !rows.length && <p className="muted">Brak kont.</p>}
          <div className="users-list">
            {rows.map(u => {
              const on = live(u, me)
              const owner = u.is_owner || u.username.toLowerCase() === 'kubvss'
              return (
                <button key={u.id} className="users-row" onClick={() => { onOpen({ id: u.id, nick: u.username }); setOpen(false) }}>
                  <i className={`users-presence ${on ? 'on' : 'off'}`} />
                  <span className="users-nick">{u.username}</span>
                  {owner && <em>Właściciel</em>}
                  <small>{on ? 'Online' : 'Offline'}</small>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <button className="users-tile" onClick={() => setOpen(v => !v)} aria-expanded={open}>👥 Użytkownicy</button>
    </div>
  )
}
