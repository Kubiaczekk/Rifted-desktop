// Public DeepLOL endpoints used by deeplol.gg (no API key). CORS allows browser fetches.
const API = 'https://b2c-api-cdn.deeplol.gg'
const SEASON = '25'

export const REGIONS = [
  { id: 'EUN', label: 'EUNE', platform: 'EUN1', tag: 'EUNE', slug: 'eun' },
  { id: 'EUW', label: 'EUW', platform: 'EUW1', tag: 'EUW', slug: 'euw' },
  { id: 'KR', label: 'KR', platform: 'KR', tag: 'KR1', slug: 'kr' },
  { id: 'NA', label: 'NA', platform: 'NA1', tag: 'NA1', slug: 'na' },
  { id: 'BR', label: 'BR', platform: 'BR1', tag: 'BR1', slug: 'br' },
  { id: 'TR', label: 'TR', platform: 'TR1', tag: 'TR1', slug: 'tr' },
  { id: 'JP', label: 'JP', platform: 'JP1', tag: 'JP1', slug: 'jp' },
] as const

export type RegionId = (typeof REGIONS)[number]['id']
export const DEFAULT_REGION: RegionId = 'EUN'

const TIER_PL: Record<string, string> = {
  IRON: 'Żelazo', BRONZE: 'Brąz', SILVER: 'Srebro', GOLD: 'Złoto', PLATINUM: 'Platyna',
  EMERALD: 'Szmaragd', DIAMOND: 'Diament', MASTER: 'Mistrz', GRANDMASTER: 'Arcymistrz', CHALLENGER: 'Pretendent',
}
const TIER_KEY: Record<string, string> = {
  IRON: 'Iron', BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold', PLATINUM: 'Platinum',
  EMERALD: 'Emerald', DIAMOND: 'Diamond', MASTER: 'Master', GRANDMASTER: 'Grandmaster', CHALLENGER: 'Challenger',
}
const APEX = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])
const ROMAN = ['', 'I', 'II', 'III', 'IV']
const ROLE_PL: Record<string, string> = { Top: 'Top', Jungle: 'Dżungla', Middle: 'Mid', Bot: 'ADC', Supporter: 'Support' }
const LANES = ['Jungle', 'Top', 'Middle', 'Bot', 'Supporter'] as const
const QUEUE: Record<number, string> = {
  420: 'Solo/Duo', 440: 'Flex', 450: 'ARAM', 400: 'Draft', 430: 'Blind', 490: 'Szybka gra',
  1700: 'Arena', 1900: 'URF', 900: 'URF', 1020: 'One for All', 1300: 'Nexus Blitz', 1400: 'Ultimate Spellbook',
}

export type Suggestion = { name: string; tag: string; tier: string }
export type GameRow = {
  win: boolean
  champ: string
  champImg: string
  role: string
  k: number
  d: number
  a: number
  items: { id: number; img: string }[]
  queue: string
  min: number
}
export type MainChamp = { champ: string; img: string; role: string; games: number; wr: number }
export type QueueStat = { label: string; wr: number; games: number; wins: number; losses: number }
export type Profile = {
  name: string
  tag: string
  region: string
  level: number
  icon: string
  url: string
  rank: string
  rankKey: string
  lp: number | null
  solo: QueueStat | null
  flex: QueueStat | null
  sampleWr: number | null
  sampleGames: number
  avgKda: number | null
  badge: 'smurf' | 'weak' | null
  badgeFrom: string | null
  mains: MainChamp[]
  roles: { role: string; rate: number; games: number }[]
  games: GameRow[]
  gamesNote: string | null
}
export type LookupResult =
  | { kind: 'ok'; profile: Profile }
  | { kind: 'missing' }
  | { kind: 'choose'; options: Suggestion[] }

const NET = 'Nie udało się połączyć z DeepLOL. Sprawdź internet i spróbuj ponownie.'
const BAD = 'DeepLOL nie zwrócił profilu. Spróbuj ponownie za chwilę.'

export function regionById(id: string) {
  return REGIONS.find(r => r.id === id) ?? REGIONS[0]
}

export function parseRiotId(raw: string, defaultTag: string): { name: string; tag: string; explicit: boolean } | null {
  const s = raw.trim().replace(/\s+/g, ' ')
  if (!s) return null
  const hash = s.indexOf('#')
  if (hash >= 0) {
    const name = s.slice(0, hash).trim()
    const tag = s.slice(hash + 1).trim()
    if (!name || !tag) return null
    return { name, tag, explicit: true }
  }
  const dash = s.match(/^(.+)-([A-Za-z0-9]{2,5})$/)
  if (dash) return { name: dash[1].trim(), tag: dash[2], explicit: true }
  return { name: s, tag: defaultTag, explicit: false }
}

function same(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

async function getJson(url: string): Promise<{ status: number; data: any }> {
  let r: Response
  try { r = await fetch(url, { signal: AbortSignal.timeout(22000) }) }
  catch { throw new Error(NET) }
  if (r.status === 404) return { status: 404, data: null }
  if (!r.ok) throw new Error(BAD)
  const data = await r.json().catch(() => null)
  if (data == null) throw new Error(BAD)
  return { status: r.status, data }
}

type Champ = { id: string; pl: string }
let champLoad: Promise<{ ver: string; byKey: Map<number, Champ> }> | null = null
function champions() {
  if (!champLoad) champLoad = (async () => {
    try {
      const vers = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', { signal: AbortSignal.timeout(12000) }).then(r => r.json()) as string[]
      const ver = vers[0] || '15.24.1'
      const j = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/pl_PL/champion.json`, { signal: AbortSignal.timeout(15000) }).then(r => r.json()) as { data: Record<string, { key: string; id: string; name: string }> }
      const byKey = new Map<number, Champ>()
      for (const c of Object.values(j.data || {})) byKey.set(Number(c.key), { id: c.id, pl: c.name })
      return { ver, byKey }
    } catch { return { ver: '15.24.1', byKey: new Map<number, Champ>() } }
  })()
  return champLoad
}

function champOf(byKey: Map<number, Champ>, ver: string, id: number) {
  const c = byKey.get(id)
  const name = c?.pl || c?.id || `Champion ${id}`
  const file = c?.id
  return { name, img: file ? `https://ddragon.leagueoflegends.com/cdn/${ver}/img/champion/${file}.png` : '' }
}

function itemImg(ver: string, id: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${ver}/img/item/${id}.png`
}

export function formatRank(tier: string, division: number): { text: string; key: string } | null {
  const t = (tier || '').trim().toUpperCase()
  if (!t || t === 'UNRANKED') return null
  const pl = TIER_PL[t] || tier
  const div = APEX.has(t) || !ROMAN[division] ? '' : ` ${ROMAN[division]}`
  return { text: `${pl}${div}`, key: TIER_KEY[t] || 'Unranked' }
}

function queueStat(label: string, q: any): QueueStat | null {
  if (!q || typeof q !== 'object') return null
  const wins = Number(q.wins) || 0
  const losses = Number(q.losses) || 0
  const games = wins + losses
  if (!games && !formatRank(q.tier, q.division)) return null
  if (!games) return null
  return { label, wr: (wins / games) * 100, games, wins, losses }
}

function badgeFor(sampleWr: number | null, sampleN: number, ranked: QueueStat | null): { badge: 'smurf' | 'weak' | null; from: string | null } {
  const useSample = sampleWr != null && sampleN >= 8
  const useRanked = !useSample && ranked != null && ranked.games >= 15
  const wr = useSample ? sampleWr : useRanked ? ranked!.wr : null
  const from = useSample ? 'ostatnich 10 gier' : useRanked ? 'Solo/Duo w tym sezonie' : null
  if (wr == null || from == null) return { badge: null, from: null }
  if (wr >= 70) return { badge: 'smurf', from }
  if (wr < 45) return { badge: 'weak', from }
  return { badge: null, from: null }
}

function mainsFrom(stat: any, byKey: Map<number, Champ>, ver: string): { mains: MainChamp[]; roles: Profile['roles'] } {
  const root = stat?.counter_champion_stats?.ranked_solo_5x5 || stat?.counter_champion_stats?.total
  const all: any[] = root?.enemy_champion_stats?.All || []
  const laneGames = new Map<number, { lane: string; games: number }>()
  for (const lane of LANES) {
    const rows: any[] = root?.enemy_champion_stats?.[lane] || []
    for (const row of rows) {
      const id = Number(row?.champion_id) || 0
      const games = Number(row?.games) || 0
      if (!id || !games) continue
      const prev = laneGames.get(id)
      if (!prev || games > prev.games) laneGames.set(id, { lane, games })
    }
  }
  const mains = all
    .filter(row => Number(row?.champion_id) > 0 && Number(row?.games) > 0)
    .sort((a, b) => (Number(b.games) || 0) - (Number(a.games) || 0))
    .slice(0, 3)
    .map(row => {
      const id = Number(row.champion_id)
      const c = champOf(byKey, ver, id)
      const lane = laneGames.get(id)?.lane
      return { champ: c.name, img: c.img, role: lane ? (ROLE_PL[lane] || lane) : '—', games: Number(row.games) || 0, wr: Number(row.win_rate) || 0 }
    })
  const pr = root?.position_rate || {}
  const roles = Object.entries(pr)
    .map(([lane, v]) => {
      const o = v as { rate?: number; games?: number }
      return { role: ROLE_PL[lane] || lane, rate: Number(o?.rate) || 0, games: Number(o?.games) || 0 }
    })
    .filter(r => r.games > 0)
    .sort((a, b) => b.games - a.games)
    .slice(0, 3)
  return { mains, roles }
}

function fallbackMains(games: GameRow[]): { mains: MainChamp[]; roles: Profile['roles'] } {
  const byChamp = new Map<string, { img: string; role: string; games: number; wins: number }>()
  const byRole = new Map<string, { games: number; wins: number }>()
  for (const g of games) {
    const c = byChamp.get(g.champ) || { img: g.champImg, role: g.role, games: 0, wins: 0 }
    c.games++; if (g.win) c.wins++
    byChamp.set(g.champ, c)
    const r = byRole.get(g.role) || { games: 0, wins: 0 }
    r.games++; if (g.win) r.wins++
    byRole.set(g.role, r)
  }
  const mains = [...byChamp.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3)
    .map(([champ, v]) => ({ champ, img: v.img, role: v.role, games: v.games, wr: (v.wins / v.games) * 100 }))
  const total = games.length || 1
  const roles = [...byRole.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3)
    .map(([role, v]) => ({ role, games: v.games, rate: (v.games / total) * 100 }))
  return { mains, roles }
}

async function summoner(name: string, tag: string, platform: string) {
  const u = new URL(`${API}/summoner/summoner`)
  u.searchParams.set('riot_id_name', name)
  u.searchParams.set('riot_id_tag_line', tag)
  u.searchParams.set('platform_id', platform)
  const { status, data } = await getJson(u.toString())
  if (status === 404 || !data || data.error) return null
  const info = data.summoner_basic_info_dict
  if (!info?.puu_id) return null
  if (!same(info.riot_id_name || '', name) || !same(info.riot_id_tag_line || '', tag)) return null
  return info as { puu_id: string; summoner_id: string; level: number; profile_id: number; riot_id_name: string; riot_id_tag_line: string }
}

async function autocomplete(name: string, tag: string, platform: string, explicit: boolean): Promise<Suggestion[]> {
  const u = new URL(`${API}/summoner/summoner-search-auto-complete`)
  u.searchParams.set('riot_id_name', name)
  u.searchParams.set('riot_id_tag_line', explicit ? tag : '')
  u.searchParams.set('platform_id', platform)
  const { data } = await getJson(u.toString())
  const rows: any[] = data?.summoners || []
  const exact = rows.filter(s => same(s.riot_id_name || '', name) && (!explicit || same(s.riot_id_tag_line || '', tag)))
  const seen = new Set<string>()
  const out: Suggestion[] = []
  for (const s of exact) {
    const key = `${s.riot_id_name}#${s.riot_id_tag_line}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const rank = formatRank(s.tier, Number(s.division) || 0)
    out.push({ name: s.riot_id_name, tag: s.riot_id_tag_line, tier: rank?.text || 'Brak rangi' })
  }
  return out
}

async function recentGames(puu: string, platform: string, ver: string, byKey: Map<number, Champ>) {
  const u = new URL(`${API}/match/matches`)
  u.searchParams.set('puu_id', puu)
  u.searchParams.set('platform_id', platform)
  u.searchParams.set('offset', '0')
  u.searchParams.set('count', '10')
  u.searchParams.set('queue_type', '0')
  u.searchParams.set('champion_id', '0')
  u.searchParams.set('only_list', '1')
  u.searchParams.set('last_updated_at', '0')
  const { data } = await getJson(u.toString())
  const ids: string[] = (data?.match_id_list || []).map((m: any) => m?.match_id).filter(Boolean).slice(0, 10)
  let failed = 0
  const rows = await Promise.all(ids.map(async (id) => {
    try {
      const m = new URL(`${API}/match/match-cached`)
      m.searchParams.set('match_id', id)
      m.searchParams.set('platform_id', platform)
      const { data: match } = await getJson(m.toString())
      const parts: any[] = match?.participants_list || []
      const me = parts.find(p => p?.puu_id === puu)
      if (!me) { failed++; return null }
      const fs = me.final_stat_dict || {}
      const champ = champOf(byKey, ver, Number(me.champion_id) || 0)
      const items = [0, 1, 2, 3, 4, 5]
        .map(i => Number(me.final_item_dict?.[`item_${i}`]) || 0)
        .filter(n => n > 0)
        .map(n => ({ id: n, img: itemImg(ver, n) }))
      const qid = Number(match?.match_basic_dict?.queue_id) || 0
      const dur = Number(match?.match_basic_dict?.game_duration) || 0
      return {
        win: !!me.is_win,
        champ: champ.name,
        champImg: champ.img,
        role: ROLE_PL[me.position] || me.position || '—',
        k: Number(fs.kills) || 0,
        d: Number(fs.deaths) || 0,
        a: Number(fs.assists) || 0,
        items,
        queue: QUEUE[qid] || 'Inny tryb',
        min: dur ? Math.round(dur / 60) : 0,
      } satisfies GameRow
    } catch { failed++; return null }
  }))
  return { games: rows.filter((g): g is GameRow => !!g), failed }
}

export async function lookupPlayer(raw: string, regionId: string): Promise<LookupResult> {
  const region = regionById(regionId)
  const parsed = parseRiotId(raw, region.tag)
  if (!parsed) throw new Error('Wpisz nick Riot.')
  if ([...parsed.name].length < 3) throw new Error('Nick musi mieć co najmniej 3 znaki.')

  let info = await summoner(parsed.name, parsed.tag, region.platform)
  if (!info) {
    const options = await autocomplete(parsed.name, parsed.tag, region.platform, parsed.explicit)
    if (options.length === 1) info = await summoner(options[0].name, options[0].tag, region.platform)
    else if (options.length > 1) return { kind: 'choose', options: options.slice(0, 6) }
  }
  if (!info) return { kind: 'missing' }

  const { ver, byKey } = await champions()
  const [live, stat, recent] = await Promise.all([
    getJson(`${API}/summoner/summoner-realtime?platform_id=${encodeURIComponent(region.platform)}&summoner_id=${encodeURIComponent(info.summoner_id || '')}&puu_id=${encodeURIComponent(info.puu_id)}`).then(r => r.data).catch(() => null),
    getJson(`${API}/summoner/champion-stat?puu_id=${encodeURIComponent(info.puu_id)}&season=${SEASON}&platform_id=${encodeURIComponent(region.platform)}`).then(r => r.data).catch(() => null),
    recentGames(info.puu_id, region.platform, ver, byKey).catch(() => ({ games: [] as GameRow[], failed: 1 })),
  ])

  const soloQ = live?.season_tier_info_dict?.ranked_solo_5x5
  const flexQ = live?.season_tier_info_dict?.ranked_flex_sr
  const solo = queueStat('Solo/Duo', soloQ)
  const flex = queueStat('Flex', flexQ)
  const rank = formatRank(soloQ?.tier, Number(soloQ?.division) || 0) || formatRank(flexQ?.tier, Number(flexQ?.division) || 0)
  const lp = rank && soloQ && Number(soloQ.league_points) > 0 ? Number(soloQ.league_points) : null
  const games = recent.games

  const sampleGames = games.length
  const wins = games.filter(g => g.win).length
  const sampleWr = sampleGames ? (wins / sampleGames) * 100 : null
  const ka = games.reduce((s, g) => s + g.k + g.a, 0)
  const deaths = games.reduce((s, g) => s + g.d, 0)
  const avgKda = sampleGames ? (deaths ? ka / deaths : ka) : null
  const { badge, from } = badgeFor(sampleWr, sampleGames, solo)
  let pool = mainsFrom(stat, byKey, ver)
  if (!pool.mains.length && games.length) pool = { ...pool, mains: fallbackMains(games).mains }
  if (!pool.roles.length && games.length) pool = { ...pool, roles: fallbackMains(games).roles }

  const iconId = Number(info.profile_id) || 0
  return {
    kind: 'ok',
    profile: {
      name: info.riot_id_name,
      tag: info.riot_id_tag_line,
      region: region.label,
      level: Number(info.level) || 0,
      icon: iconId ? `https://ddragon.leagueoflegends.com/cdn/${ver}/img/profileicon/${iconId}.png` : '',
      url: `https://www.deeplol.gg/summoner/${region.slug}/${encodeURIComponent(`${info.riot_id_name}-${info.riot_id_tag_line}`)}`,
      rank: rank?.text || 'Brak rangi',
      rankKey: rank?.key || 'Unranked',
      lp,
      solo,
      flex,
      sampleWr,
      sampleGames,
      avgKda,
      badge,
      badgeFrom: badge ? from : null,
      mains: pool.mains,
      roles: pool.roles,
      games,
      gamesNote: games.length ? (recent.failed ? 'Część ostatnich gier nie wczytała się z DeepLOL.' : null) : 'DeepLOL nie zwrócił ostatnich gier tego gracza.',
    },
  }
}
