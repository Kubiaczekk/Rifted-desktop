import { api } from './api'
export type Account = { nick: string; id: number; created: number }
export const getAccount = (nick: string): Account | undefined => { if (!localStorage.getItem('rifted-token')) return; try { const a = JSON.parse(localStorage.getItem('rifted-me') || 'null'); if (a && a.nick.toLowerCase() === nick.toLowerCase()) return a } catch {} return { nick, id: 0, created: Date.now() } }
async function auth(path: string, nick: string, pw: string): Promise<string | Account> {
  try {
    const r = await api<{ user: { id: number; username: string }; token: string }>(path, { method: 'POST', body: { username: nick.trim(), password: pw } })
    localStorage.setItem('rifted-token', r.token); const a = { nick: r.user.username, id: r.user.id, created: Date.now() }; localStorage.setItem('rifted-me', JSON.stringify(a)); return a
  } catch (e) { return (e as Error).message }
}
export async function register(nick: string, pw: string, pw2: string): Promise<string | Account> {
  if (pw !== pw2) return 'Hasła nie są takie same.'
  return auth('/api/auth/register', nick, pw)
}
export const login = (nick: string, pw: string) => auth('/api/auth/login', nick, pw)
export const logout = () => localStorage.removeItem('rifted-token')
