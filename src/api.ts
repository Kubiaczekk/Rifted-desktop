export const API = (import.meta.env.VITE_API_URL as string) || 'https://rifted-server.onrender.com'
export const getToken = () => localStorage.getItem('rifted-token')
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = getToken(); if (t) h.Authorization = `Bearer ${t}`
  let r: Response
  const go = () => fetch(API + path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: AbortSignal.timeout(70000) })
  // darmowy Render budzi się ~50 s — przy błędzie sieci próbujemy jeszcze raz
  try { r = await go() } catch { try { r = await go() } catch { throw new Error('Brak połączenia z serwerem Rifted (serwer może się budzić — spróbuj za chwilę).') } }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Błąd serwera.')
  return j
}
