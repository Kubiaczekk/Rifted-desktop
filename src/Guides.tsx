import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from './api'
import { lookupPlayer, regionIdFromPlatform, type GameRow } from './deeplol'
import { EARLY as META_EARLY, META } from './metaBuilds'
const DD = 'https://ddragon.leagueoflegends.com'
type Role = 'Top'|'Jungle'|'Mid'|'ADC'|'Support'
type Champ = { id: string; key: string; pl: string; title: string; tags: string[]; role: Role; diff: number }
type Item = { id: string; name: string; gold: number; tags: string[]; boots: boolean }
type Variant = 'meta'|'burst'|'safe'
const RANKS = ['Bronze','Silver','Gold','Platinum','Emerald','Diamond','Master+','Challenger']
const ROLES: (Role|'Wszystkie')[] = ['Wszystkie','Top','Jungle','Mid','ADC','Support']
const VNAME: Record<Variant,string> = { meta:'Meta', burst:'Vs squishy / bomba', safe:'Safe' }
// Curated tips (rest generated)
const TIPS: Record<string,string> = {
  Kassadin:'Przetrwaj linię do 6 lvl, potem skaluj — od 16 lvl jesteś bossem.', Ahri:'Trafiaj E (Urok) przed resztą combo.',
  Jinx:'Po killu pasywka daje szał — wchodź w walkę śmiało.', Thresh:'Latarnia (W) ratuje ADC — rzucaj ją przed combo wroga.',
  Yasuo:'Ściana Wiatru (W) blokuje pociski — trzymaj ją na kluczowy skill.', Garen:'Spinuj (E) i dobijaj ultem przy niskim HP wroga.',
  LeeSin:'Gankuj wcześnie — Lee jest najsilniejszy na początku gry.', Zed:'Ustaw cień (W) przed R, żeby mieć bezpieczny powrót.',
}
const ROLE_FIX: Record<string,Role> = { Jinx:'ADC',Caitlyn:'ADC',Ezreal:'ADC',Ashe:'ADC',Jhin:'ADC',KaiSa:'ADC',Kaisa:'ADC',Vayne:'ADC',MissFortune:'ADC',Lux:'Support',LeeSin:'Jungle',Vi:'Jungle',Zed:'Mid',Yasuo:'Mid',Darius:'Top',Garen:'Top',Graves:'Jungle',Kindred:'Jungle',Nidalee:'Jungle',Kayn:'Jungle',Evelynn:'Jungle',Khazix:'Jungle',Elise:'Jungle',Shaco:'Jungle',Rengar:'Jungle',Hecarim:'Jungle',Amumu:'Jungle',Sejuani:'Jungle',Zac:'Jungle',Warwick:'Jungle',MasterYi:'Jungle',XinZhao:'Jungle',JarvanIV:'Jungle',Viego:'Jungle',BelVeth:'Jungle',Belveth:'Jungle',Lillia:'Jungle',Ekko:'Jungle',Nocturne:'Jungle' }
function roleOf(id: string, tags: string[]): Role {
  if (ROLE_FIX[id]) return ROLE_FIX[id]
  const [a, b] = tags
  if (a==='Marksman') return 'ADC'
  if (a==='Support' || (a==='Tank' && b==='Support')) return 'Support'
  if (a==='Mage' || a==='Assassin') return 'Mid'
  return 'Top'
}
// u.gg public stats (stats2.u.gg, CORS *): rankings[region=12 world][rank][role] = [wins, matches, rank, total, ...]
const UGG_RANK = ['7','6','5','4','17','3','14','1'] // Bronze..Challenger
const UGG_ROLE: Record<Role,string> = { Jungle:'1', Support:'2', ADC:'3', Top:'4', Mid:'5' } as any
type Ugg = Record<string, Record<string, number[]>>
const uggCache = new Map<string, Promise<Ugg|null>>()
async function uggPatch(ver: string) { try { const p: string[] = await (await fetch('https://static.bigbrain.gg/assets/lol/riot_patch_update/prod/ugg/patches.json')).json(); return p[0] } catch { const [a,b] = ver.split('.'); return `${a}_${b}` } }
function uggChamp(patch: string, key: string) {
  const k = patch+key; if (!uggCache.has(k)) uggCache.set(k, fetch(`https://stats2.u.gg/lol/1.5/rankings/${patch}/ranked_solo_5x5/${key}/1.5.0.json`).then(r => r.ok ? r.json() : null).then(j => j?.['12'] || null).catch(() => null))
  return uggCache.get(k)!
}
function tierOf(wr: number, pr: number) { const s = (wr-50)*1.0 + Math.min(pr,15)*0.15; return s>=2.2?'S':s>=1?'A':s>=0?'B':s>=-1.2?'C':'D' }
function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h>>>0) / 4294967295 }
function stats(c: Champ, rank: number, v: Variant) {
  const base = hash(c.id), skill = (c.diff - 5) / 5 // hard champs gain at high elo
  const wr = 47.5 + base*5 + skill*(rank-3.5)*0.5 + (v==='meta'?0.6:v==='safe'?-0.2:-0.5)
  const pr = (1.5 + hash(c.id+'p')*10) * (1 + skill*(rank-3.5)*0.08) * (v==='meta'?0.62:v==='burst'?0.22:0.16)
  const br = Math.max(0.3, hash(c.id+'b')*18 + skill*rank)
  return { wr: wr.toFixed(1), pr: pr.toFixed(1), br: br.toFixed(1), games: Math.round((2000 + hash(c.id+'g')*40000) * (rank<6?1:0.15)) }
}
// build: curated, role-correct templates (item IDs verified on ddragon 16.21.1, names live in PL)
type T = Record<Variant,string[]> // [core, boots, ...4 items]
const TPL: Record<string,T> = {
  mage:{meta:['6655','3020','4645','3089','3157','3135'],burst:['4646','3020','4645','3089','3135','3137'],safe:['6655','3158','3157','3102','3089','3135']},
  apAssassin:{meta:['3100','3020','4645','3089','3157','3041'],burst:['3100','3020','4645','3089','3115','3135'],safe:['3100','3111','4645','3157','3089','3102']},
  apBruiser:{meta:['4633','3020','3115','3157','3089','3135'],burst:['4633','3020','3115','4645','3089','3135'],safe:['4633','3111','3157','3115','3102','3089']},
  adAssassin:{meta:['6697','3158','6692','3814','6694','3026'],burst:['6697','3158','3179','6694','3814','6692'],safe:['6692','3047','3814','3053','3026','3156']},
  adc:{meta:['3032','3006','3031','3094','3036','3026'],burst:['6676','3006','3031','3036','3033','3072'],safe:['3032','3006','3031','3046','3139','3026']},
  fighter:{meta:['6610','3047','3071','3053','6333','3065'],burst:['6610','3158','3071','6694','6333','3053'],safe:['6610','3047','3053','6333','3065','3742']},
  tank:{meta:['3068','3047','2502','6665','3065','3075'],burst:['3068','3111','6662','3742','2502','6665'],safe:['6665','3111','3065','4401','3143','3075']},
  enchanter:{meta:['6617','3158','3504','3107','3222','6620'],burst:['6620','3158','4005','3504','6653','3165'],safe:['6617','3111','3222','3107','3190','2065']},
  tankSup:{meta:['3190','3047','3109','3050','2502','4401'],burst:['3190','3111','3050','3742','3068','4401'],safe:['3190','3111','3109','3222','4401','6665']},
}
const JTPL: Record<string,T> = {
  jungle:{meta:['6610','3047','3071','3053','6333','3065'],burst:['6692','3158','3071','6694','6333','3053'],safe:['6610','3047','3053','3742','6333','3065']},
  jungleAD:{meta:['6698','3158','6697','6696','6694','3814'],burst:['6697','3158','6698','6696','6694','3814'],safe:['6698','3047','6692','3814','6333','3053']},
  jungleAP:{meta:['6653','3020','3115','3157','3089','3135'],burst:['4646','3020','3115','4645','3089','3135'],safe:['4633','3111','3157','3115','3102','6653']},
  jungleTank:{meta:['3084','3047','3068','6665','3075','4401'],burst:['3068','3111','6665','3742','3084','4401'],safe:['3084','3111','6665','4401','3075','3065']},
}
const CUR: Record<string,T> = {
  Hecarim:{meta:['3161','3158','6333','2517','3156','3053'],burst:['6692','3158','3161','6694','2517','3156'],safe:['3078','3111','3053','6333','3742','3065']},
  Rengar:{meta:['3179','3158','6698','3036','3814','3031'],burst:['6697','3158','6698','3814','3036','3031'],safe:['6698','3047','3071','3053','6333','3026']},
  Anivia:{meta:['3003','3020','3118','3089','3157','3135'],burst:['3003','3020','3118','4645','3089','3137'],safe:['3003','3158','3157','3102','3118','3089']},
  Ahri:{meta:['4646','3020','4645','3089','3157','3135'],burst:['4646','3020','4645','3089','3135','3137'],safe:['4646','3158','3157','3102','3089','3135']},
  Kassadin:{meta:['6657','3020','3003','3089','3157','3135'],burst:['6657','3020','3100','4645','3089','3135'],safe:['6657','3111','3003','3157','3102','3089']},
  Lux:{meta:['6655','3020','4645','3089','3135','3157'],burst:['6655','3020','4645','3089','3135','3137'],safe:['6655','3158','3157','3102','3089','3135']},
  Syndra:{meta:['6655','3020','4645','3089','3135','3157'],burst:['6655','3020','4645','3089','3135','3137'],safe:['6655','3158','3157','3102','3089','3135']},
  Orianna:{meta:['3118','3020','6655','3089','3157','3135'],burst:['6655','3020','4645','3089','3135','3137'],safe:['3118','3158','3157','3102','3089','3135']},
  Viktor:{meta:['3003','3020','6655','3089','3157','3135'],burst:['6655','3020','4645','3089','3135','3137'],safe:['3003','3158','3157','3102','3089','3135']},
  Annie:{meta:['6655','3020','4645','3089','3157','3135'],burst:['4646','3020','4645','3089','3135','3137'],safe:['6655','3158','3157','3102','3089','3135']},
  Twitch:{meta:['6676','3006','2512','3031','3036','3026'],burst:['6676','3006','3031','3036','3072','3026'],safe:['3032','3006','3031','3046','3139','3026']},
  Jinx:{meta:['3032','3006','3031','3094','3036','3026'],burst:['3032','3006','3031','3033','3036','3072'],safe:['3032','3006','3031','3046','3139','3026']},
  Vayne:{meta:['3153','3006','3124','3091','6672','3026'],burst:['3153','3006','3124','6672','3033','3072'],safe:['3153','3006','3124','3091','3139','3026']},
  Katarina:{meta:['3100','3020','4645','3089','3157','3041'],burst:['3100','3020','4645','3089','3115','3135'],safe:['3100','3111','4645','3157','3089','3102']},
}
const AP_ASSASSIN = new Set(['Akali','Diana','Ekko','Evelynn','Fizz','Katarina','Leblanc','Elise','Nidalee','Shaco','Sylas'])
const AP_BRUISER = new Set(['Gwen','Mordekaiser','Gragas','Lillia','Rumble','Kennen','Singed','Vladimir','Kayle','Teemo'])
const TANK_SUP = new Set(['Leona','Alistar','Braum','Nautilus','Rell','Taric','Thresh','Rakan','Blitzcrank','Pyke','TahmKench','Maokai','Poppy','Amumu'])
function tplOf(c: Champ): string {
  const t = c.tags[0]
  if (c.role==='Support') return TANK_SUP.has(c.id) || t==='Tank' ? 'tankSup' : t==='Mage' ? 'mage' : 'enchanter'
  if (c.role==='ADC') return t==='Mage' ? 'mage' : 'adc'
  if (t==='Mage') return 'mage'
  if (AP_BRUISER.has(c.id)) return 'apBruiser'
  if (AP_ASSASSIN.has(c.id)) return 'apAssassin'
  if (t==='Assassin') return 'adAssassin'
  if (t==='Marksman') return 'adc'
  if (t==='Tank') return 'tank'
  return 'fighter'
}
function build(c: Champ, items: Item[], v: Variant, _rank: number) {
  const base = META[c.id] || CUR[c.id] || (c.role==='Jungle' ? JTPL[tplKey(c)] : TPL[c.role==='Support' && tplOf(c)==='mage' ? 'mage' : tplOf(c)])
  const ids = base[v], m = new Map(items.map(i => [i.id, i]))
  return ids.map(id => m.get(id)).filter(Boolean) as Item[]
}
type Early = { start: string[]; back: string[]; gold: string; tip: string }
const ETPL: Record<string,Early> = {
  mage:{start:['1056','2003','2003'],back:['1052','1001','2003'],gold:'~700–1300 g',tip:'Pierwszy back: Tom (lub Wybuchowa Różdżka przy 850 g) + buty.'},
  apAssassin:{start:['1056','2003','2003'],back:['3145','1001'],gold:'~1100–1400 g',tip:'Cofnij się z ~1100 g pod Alternator — mocny spike na all-in. Mniej golda: Wybuchowa Różdżka.'},
  adAssassin:{start:['1055','2003'],back:['3134','2003'],gold:'~1000 g',tip:'Ząbkowany Sztylet na pierwszym backu = lethality spike, idealnie pod roam po 6 lvl.'},
  fighter:{start:['1055','2003'],back:['3133','1001'],gold:'~1050–1350 g',tip:'Młot Caulfielda (lub Długi Miecz + buty przy mniejszym goldzie). Przy ciężkim matchupie zacznij Tarczą Dorana.'},
  tank:{start:['1054','2003'],back:['1028','1001','1029'],gold:'~700–1000 g',tip:'Rubin + buty; vs AD dorzuć Płócienną Zbroję, vs AP Szarfę Mroku.'},
  adc:{start:['1055','2003'],back:['1038','1001'],gold:'',tip:'Start: Ostrze Dorana + mikstura (Łuk Dorana też OK). Pierwszy back: Miecz B.F. (najlepiej) albo Kilof / Noonquiver pod pierwszy item + buty, jeśli zostaje gold. Nie backuj z resztką golda bez komponentu.'},
  enchanter:{start:['3865','2003','2003'],back:['2055','1027','1001'],gold:'~500–800 g',tip:'Ward kontrolny zawsze, potem Kryształ Szafiru / buty. Uzupełniaj wardy po każdym backu.'},
  tankSup:{start:['3865','2003','2003'],back:['2055','1028','1001'],gold:'~500–800 g',tip:'Ward kontrolny + Rubin, buty mobilne gdy roamujesz. Kontroluj bot bush.'},
  jungle:{start:['1101','2003'],back:['3133','2055'],gold:'~700–1100 g',tip:'Starter jungla wg stylu (Scorchclaw = ganki/1v1, Gustwalker = mobilność, Mosstomper = tank). Full clear = lvl 4, potem gank lub back. Na backu komponent pod pierwszy item (Młot Caulfielda / Dirk / Wybuchowa Różdżka) + Control Ward — nie buty i nie ułamki.'},
  jungleAP:{start:['1101','2003'],back:['1026','2055'],gold:'',tip:'Full clear = lvl 4. Pierwszy back: Wybuchowa Różdżka (850) lub Tom pod pierwszy item + Control Ward.'},
  jungleTank:{start:['1103','2003'],back:['1028','2055','1001'],gold:'',tip:'Mosstomper na start. Full clear = lvl 4. Pierwszy back: Rubin + Control Ward (+ buty jeśli zostaje).'},
  jungleAD:{start:['1101','2003'],back:['3134','2055'],gold:'',tip:'Full clear = lvl 4. Pierwszy back: Ząbkowany Sztylet (Dirk) + Control Ward — lethality spike pod ganki.'},
  apBruiser:{start:['1056','2003','2003'],back:['1026','1001'],gold:'~850–1200 g',tip:'Pierwszy back: Wybuchowa Różdżka albo komponent pod Riftmaker / Nashor. Buty Maga, Mercury gdy dużo CC.'},
}
const ECUR: Record<string,Early> = {
  Hecarim:{start:['1102','2003'],back:['3057','2055'],gold:'',tip:'Gustwalker na start — szybkie rotacje i ganki. Full clear = lvl 4 (~3:10), potem skuttle albo gank z E. Pierwszy back: Sheen (Lśnienie) pod Włócznię Shojin (albo Kilof/Rubin, gdy brakuje golda) + Control Ward. Buty (Lucidity) dopiero przy drugim zakupie.'},
  Rengar:{start:['1102','2003'],back:['3134','2055'],gold:'~1000 g',tip:'Gustwalker na start (Scorchclaw 1101 jeśli grasz pod wczesne ganki). Full clear do 4 lvl, pierwszy back: Ząbkowany Sztylet (Dirk), gdy cię stać, + Control Ward; buty dopiero później razem z core; skacz z krzaków pod 6 lvl.'},
  Kassadin:{start:['1082','2031'],back:['3070','1001'],gold:'~700 g',tip:'Darkseal + Refillable. Pierwszy back: Łza (stackuj od razu) + buty; potem Zaginiony Rozdział. Vs AP lane dobierz Szarfę Mroku (1033), trzymaj się z dala od trade’ów do 6 lvl.'},
  Anivia:{start:['1056','2003','2003'],back:['3070','1001'],gold:'~700 g',tip:'Łza jak najwcześniej (pod Kostur Archanioła), potem buty i Zaginiony Rozdział.'},
  Ahri:{start:['1056','2003','2003'],back:['3802'],gold:'~1200 g',tip:'Zaginiony Rozdział na pierwszym backu = spam Q i mana na roam. Mniej golda: Tom + buty.'},
  Lux:{start:['3865','2003','2003'],back:['1052','2055','1001'],gold:'~500–900 g',tip:'Supp Lux: Tom + ward kontrolny. Na midzie: Pierścień Dorana i Zaginiony Rozdział.'},
  Syndra:{start:['1056','2003','2003'],back:['3802'],gold:'~1200 g',tip:'Zaginiony Rozdział → Luden. Przy 850 g Wybuchowa Różdżka.'},
  Orianna:{start:['1056','2003','2003'],back:['3070','1052'],gold:'~800 g',tip:'Łza + Tom pod Archanioła/Seraph lub Rozdział pod Ludena.'},
  Viktor:{start:['1056','2003','2003'],back:['3802'],gold:'~1200 g',tip:'Zaginiony Rozdział i upgrade Q (Hex) jak najszybciej.'},
  Annie:{start:['1056','2003','2003'],back:['1026','1001'],gold:'~1150 g',tip:'Wybuchowa Różdżka + buty — bomba z flasha już po pierwszym backu.'},
  Twitch:{start:['1055','2003'],back:['1038','1001'],gold:'',tip:'Ostrze Dorana + mikstura (Łuk Dorana też OK). Pierwszy back: Miecz B.F. (1300) pod Kolekcjonera, + buty jeśli starczy; przy ~900 g Kilof. Od 6 lvl roam/flank z Q niewidzialnością.'},
  Jinx:{start:['1055','2003'],back:['1037','2003'],gold:'~875 g',tip:'Kilof pod Kraken Slayera; ewentualnie Płaszcz Zwinności.'},
  Vayne:{start:['1055','2003'],back:['1043','1001'],gold:'~1300 g',tip:'Łuk Rekurwowy pod BotRK, buty wcześnie — Vayne żyje z kitingu.'},
  Thresh:{start:['3865','2003','2003'],back:['2055','1029','1001'],gold:'~450–700 g',tip:'Ward kontrolny + Płócienna Zbroja/buty. Zajmuj wizję przed hookiem.'},
  Yasuo:{start:['1055','2003'],back:['1018','1001'],gold:'~900 g',tip:'Płaszcz Zwinności pod pasywkę + buty.'},
  Zed:{start:['1036','2003','2003','2003'],back:['3134','2003'],gold:'~1000 g',tip:'Ząbkowany Sztylet = spike na all-in po 6.'},
  LeeSin:{start:['1101','2003'],back:['1036','1001','2055'],gold:'~700–1000 g',tip:'Scorchclaw, ganki od 3 lvl. Na backu Długi Miecz + ward kontrolny.'},
  Garen:{start:['1054','2003'],back:['1001','1036'],gold:'~650 g',tip:'Tarcza Dorana dla sustainu, potem buty i Długi Miecz.'},
  Katarina:{start:['1082','2031'],back:['3113','3057'],gold:'~700–1100 g',tip:'Dark Seal na start. Pierwszy back: Eteryczny Duszek albo Blask pod Lich Bane. Buty Maga, Mercury gdy dużo CC.'},
}
function early(c: Champ): Early {
  const live = META_EARLY[c.id]
  if (live?.start?.length) return live
  if (ECUR[c.id]) return ECUR[c.id]
  if (c.role==='Support') return ETPL[TANK_SUP.has(c.id)||c.tags[0]==='Tank'?'tankSup':'enchanter']
  if (c.role==='ADC') return ETPL.adc
  if (c.role!=='Jungle') return ETPL[tplOf(c)] || ETPL.fighter
  const t = tplOf(c)
  return t==='mage'||t==='apAssassin'||t==='apBruiser' ? ETPL.jungleAP : t==='tank' ? ETPL.jungleTank : t==='adAssassin' ? ETPL.jungleAD : ETPL.jungle
}
export const VTIP: Record<Variant,string> = {
  meta:'Najczęściej wybierany zestaw na tej randze — stabilny w każdej grze.',
  burst:'Pod bombę: maksymalne obrażenia w krótkim czasie, łap squishy (ADC, mid) z flanki.',
  safe:'Bezpieczniej: więcej HP i odporności, graj pod drużynę i nie dawaj killi.',
}
type OtpPlayer = { nick: string; tag: string; region: string; tier: string; rank: string; lp: number; winRate: number; games: number; iconId: number | null }
const REGION_SHORT: Record<string, string> = {
  euw1: 'EUW', euw: 'EUW', eun1: 'EUNE', eun: 'EUNE', eune: 'EUNE', na1: 'NA', na: 'NA', kr: 'KR', kr1: 'KR',
  br1: 'BR', br: 'BR', jp1: 'JP', jp: 'JP', la1: 'LAN', lan: 'LAN', la2: 'LAS', las: 'LAS', oc1: 'OCE', oce: 'OCE',
  tr1: 'TR', tr: 'TR', ru: 'RU', vn2: 'VN', vn: 'VN', tw2: 'TW', tw: 'TW', sg2: 'SG', me1: 'ME', ph2: 'PH', th2: 'TH',
}
function shortRegion(region: string) {
  const k = region.trim().toLowerCase()
  return REGION_SHORT[k] || (k ? region.trim().toUpperCase() : '—')
}
function prettyTier(tier: string) {
  const t = tier.trim()
  if (!t) return ''
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t
  return t.toLowerCase().replace(/(^|[\s_-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
}
function fmtTier(tier: string, rank: string) {
  const t = prettyTier(tier), r = rank.trim()
  if (!t) return prettyTier(r) || '—'
  if (!r || r === '0' || /^null|undefined$/i.test(r) || r.toLowerCase() === t.toLowerCase()) return t
  if (/^(i|ii|iii|iv)$/i.test(r)) return `${t} ${r.toUpperCase()}`
  return `${t} ${prettyTier(r)}`
}
function fmtWr(winRate: number) {
  if (!Number.isFinite(winRate)) return '—'
  const pct = winRate >= 0 && winRate <= 1 ? winRate * 100 : winRate
  return pct.toFixed(1)
}
function num(v: unknown) {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}
function topOtps(body: { players?: unknown } | null | undefined): OtpPlayer[] {
  if (!Array.isArray(body?.players)) return []
  const rows: OtpPlayer[] = []
  for (const raw of body.players) {
    if (!raw || typeof raw !== 'object') continue
    const p = raw as Record<string, unknown>
    const nick = String(p.nick ?? '').trim()
    if (!nick) continue
    const icon = num(p.iconId)
    rows.push({
      nick, tag: String(p.tag ?? '').trim(), region: String(p.region ?? ''),
      tier: String(p.tier ?? ''), rank: String(p.rank ?? ''),
      lp: num(p.lp) ?? 0, winRate: num(p.winRate) ?? 0, games: Math.max(0, Math.round(num(p.games) ?? 0)),
      iconId: icon && icon > 0 ? Math.round(icon) : null,
    })
  }
  return rows.sort((a, b) => b.lp - a.lp).slice(0, 3)
}
function riotId(o: OtpPlayer) { return o.tag ? `${o.nick}#${o.tag}` : o.nick }
function kdaNum(k: number, d: number, a: number) { return d ? (k + a) / d : k + a }
function kdaTxt(n: number) { return n.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }
function PlayerGame({ g }: { g: GameRow }) {
  const [bad, setBad] = useState(false)
  return <div className={'pm-g ' + (g.win ? 'win' : 'loss')}>
    <b className="pm-r">{g.win ? 'W' : 'L'}</b>
    {g.champImg && !bad ? <img className="pm-cimg" src={g.champImg} alt="" onError={() => setBad(true)} /> : <span className="pm-cimg pm-letter">{(g.champ || '?').slice(0, 1)}</span>}
    <span className="pm-c">{g.champ}{g.role && g.role !== '—' ? <small>{g.role}</small> : null}</span>
    <span className="pm-k">{g.k} / {g.d} / {g.a}</span>
    <small className="pm-meta">{kdaTxt(kdaNum(g.k, g.d, g.a))} KDA{g.queue ? ` · ${g.queue}` : ''}{g.min ? ` · ${g.min} min` : ''}</small>
    <div className="pm-it">{g.items.map((it, i) => <img key={`${it.id}-${i}`} src={it.img} alt="" />)}</div>
  </div>
}
function PlayerModal({ o, c, ver, close }: { o: OtpPlayer; c: Champ; ver: string; close: () => void }) {
  const [iconBad, setIconBad] = useState(false)
  const [champBad, setChampBad] = useState(false)
  const [profileIcon, setProfileIcon] = useState('')
  const [games, setGames] = useState<GameRow[] | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ok' | 'empty' | 'err'>('loading')
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && close(); addEventListener('keydown', f); return () => removeEventListener('keydown', f) }, [close])
  useEffect(() => { const b = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = b } }, [])
  const regionId = regionIdFromPlatform(o.region)
  const canFetch = !!regionId && [...o.nick].length >= 3
  useEffect(() => {
    if (!regionId || !canFetch) return
    let alive = true
    lookupPlayer(o.tag ? `${o.nick}#${o.tag}` : o.nick, regionId).then(res => {
      if (!alive) return
      if (res.kind !== 'ok') { setGames([]); setPhase('empty'); return }
      if (res.profile.icon) setProfileIcon(res.profile.icon)
      const list = res.profile.games.slice(0, 10)
      setGames(list)
      setPhase(list.length ? 'ok' : 'empty')
    }).catch(() => { if (alive) { setGames([]); setPhase('err') } })
    return () => { alive = false }
  }, [o.nick, o.tag, o.region, regionId, canFetch])
  const shown = canFetch ? phase : 'empty'
  const name = riotId(o), region = shortRegion(o.region), tier = fmtTier(o.tier, o.rank)
  const champSrc = ver ? `${DD}/cdn/${ver}/img/champion/${c.id}.png` : ''
  const profileSrc = profileIcon || (ver && o.iconId ? `${DD}/cdn/${ver}/img/profileicon/${o.iconId}.png` : '')
  const showProfile = !!profileSrc && !iconBad
  const avatar = showProfile ? profileSrc : (!champBad ? champSrc : '')
  const sample = games || []
  const wins = sample.filter(g => g.win).length
  const ka = sample.reduce((s, g) => s + g.k + g.a, 0)
  const deaths = sample.reduce((s, g) => s + g.d, 0)
  const recent = shown === 'loading' ? '…' : sample.length ? `${wins}W ${sample.length - wins}L` : '—'
  const kda = shown === 'loading' ? '…' : sample.length ? kdaTxt(kdaNum(ka, deaths, 0)) : '—'
  return createPortal(<div className="pm-back" onClick={close}><div className="glass pm" role="dialog" aria-modal="true" aria-label={name} onClick={e => e.stopPropagation()}>
    <div className="pm-head">
      <div className="pm-av">
        {avatar ? <img className={showProfile ? 'pm-pi' : 'pm-face'} src={avatar} alt="" onError={() => showProfile ? setIconBad(true) : setChampBad(true)} /> : <span className="pm-letter">{(o.nick || '?').slice(0, 1).toUpperCase()}</span>}
        {showProfile && champSrc && !champBad && <img className="pm-badge" src={champSrc} alt="" onError={() => setChampBad(true)} />}
      </div>
      <div className="pm-id">
        <h2 title={name}>{name}</h2>
        <div className="pm-tags"><span>{region}</span><span className="pm-tier">{tier}</span><span className="pm-lp">{Math.round(o.lp)} LP</span></div>
      </div>
      <button className="pill pm-x" onClick={close} aria-label="Zamknij">✕</button>
    </div>
    <div className="pm-stats">
      <div className="pm-stat"><b>{fmtWr(o.winRate)}%</b><span>WR na {c.pl}</span></div>
      <div className="pm-stat"><b>{o.games.toLocaleString('pl')}</b><span>Gier na {c.pl}</span></div>
      <div className="pm-stat"><b>{recent}</b><span>Ostatnie 10</span></div>
      <div className="pm-stat"><b>{kda}</b><span>KDA · 10 gier</span></div>
    </div>
    <h3 className="pm-h3">Ostatnie 10 gier</h3>
    {shown === 'loading' && <div className="pm-games" aria-busy="true"><p className="pm-wait">Wczytuję ostatnie gry…</p>{[0, 1, 2].map(i => <div key={i} className="pm-skel" />)}</div>}
    {shown === 'empty' && <p className="pm-empty">Brak ostatnich gier tego gracza.</p>}
    {shown === 'err' && <p className="pm-empty">Nie udało się wczytać ostatnich gier. Spróbuj ponownie za chwilę.</p>}
    {shown === 'ok' && games && <div className="pm-games">{games.map((g, i) => <PlayerGame key={`${g.champ}-${i}`} g={g} />)}</div>}
  </div></div>, document.body)
}

// ---- Poradnik ----
function Ico({src, alt, size=48}:{src:string, alt:string, size?:number}) {
  const [bad, setBad] = useState(false), [tries, setTries] = useState(0)
  useEffect(() => { setBad(false); setTries(0) }, [src])
  const ok = !!src && !src.includes('/cdn//') && !src.includes('/cdn/undefined') && !bad
  const url = tries ? src + (src.includes('?') ? '&' : '?') + 'r=1' : src
  return <div className="pico" style={{width:size,height:size,minWidth:size,minHeight:size}} title={alt}>{ok ? <img key={url} src={url} alt={alt} width={size} height={size} onError={()=> tries ? setBad(true) : setTries(1)}/> : <em>{(alt||'?')[0]}</em>}</div>
}
const SUM: Record<string,[string,string]> = { Flash:['SummonerFlash','Flash'], Smite:['SummonerSmite','Smite'], Ignite:['SummonerDot','Podpalenie'], TP:['SummonerTeleport','Teleport'], Heal:['SummonerHeal','Leczenie'], Exhaust:['SummonerExhaust','Wyczerpanie'], Barrier:['SummonerBarrier','Bariera'], Ghost:['SummonerHaste','Duch'], Cleanse:['SummonerBoost','Oczyszczenie'] }
type Guide = { order: ('Q'|'W'|'E')[]; sums: [string,string][]; easy: string[]; hard: string[]; spikes: string[]; play: string }
const GCUR: Record<string, Guide> = {
  Hecarim: { order:['Q','W','E'], sums:[['Ghost','Smite'],['Flash','Smite']], easy:['Karthus','Shyvana','Lillia','Amumu','Diana'], hard:['XinZhao','Trundle','Poppy','Vi','Warwick'],
    spikes:['Lvl 3 — gank z E (Szarża) + Q, mocny early clear.','Lvl 4 po full clearze — pierwszy gank lub skuttle.','Lvl 6 — R (Natarcie Cieni) z dystansu: ganki przez pół mapy i engage w teamfight.','Włócznia Shojin (1 item) — największy spike, szybkie Q; zaczynaj inwazje.','2–3 itemy (Shojin/DD/Endless Hunger) — teamfighty: wjazd R+E na backline.'],
    play:'Q spamuj w clearze (stacki), E z dystansu do ganka i odrzucenia celu w swoją drużynę, R na grupę/carry. Hecarim skaluje z prędkością ruchu — wchodź z boku, nie przez front. Xin Zhao i Trundle wygrywają z Tobą wczesne 1v1 — unikaj ich inwazji przed Trinity; Poppy (W) zatrzymuje Twoje E/R.' },
  Twitch: { order:['E','Q','W'], sums:[['Flash','Barrier'],['Flash','Exhaust']], easy:['KogMaw','Aphelios','Jinx','Smolder','Senna'], hard:['Draven','Caitlyn','Lucian','Samira','Ashe'],
    spikes:['Lvl 2/3 — z suppem all-in na stackach E (Skażenie).','Lvl 6 — R (Rat-ta-tat-tat) przebija linię: zasięg + pierwsze roamy/flanki z Q.','Kolekcjoner (1 item) — egzekucja i burst z niewidzialności.','2–3 itemy (Fiendhunter/IE) — przejmujesz teamfighty z flanki.'],
    play:'Max E (Skażenie), stackuj pasywkę autoatakami i odpalaj E przy 5–6 stackach. Q to niewidzialność na flank/ucieczkę — wchodź z boku, gdy front wroga zużyje CC. Vs Draven/Caitlyn/Lucian graj pod farm i czekaj na 6 lvl; Jinx/Kog’Maw/Aphelios karz all-inem przed ich itemami.' },
  Rengar: { order:['Q','E','W'], sums:[['Flash','Smite']], easy:['Zyra','Lillia','Karthus','Shyvana','Fiddlesticks'], hard:['MasterYi','Rammus','Udyr','Warwick','Poppy'],
    spikes:['Lvl 4 — po full clearze pierwszy gank/skok z krzaka z pełnym Ferocity.','Lvl 6 — R pozwala na ganki z mgły wojny; kontroluj, kto ma wardy kontrolne.','1 item (Hydra/Umbral) — one-shot na squishy, zaczynaj inwazje.','2–3 itemy — szczyt mocy; po 30 min skaluje słabiej, kończ grę.'],
    play:'Graj z krzaków i bocznych wejść, poluj na odizolowanych carry. Nie forsuj 5v5 przed 2 itemami. Poppy i Rammus kontrują skok — wchodź dopiero po ich CC.' },
}
const GTPL: Record<string, Omit<Guide,'easy'|'hard'>> = {
  jungle:{order:['Q','E','W'],sums:[['Flash','Smite']],spikes:['Lvl 4 — pierwszy gank po full clearze.','Lvl 6 — ultimate, ganki na każdą linię.','1–2 itemy — kontroluj smoki i Herolda.'],play:'Śledź pozycję junglera wroga, gankuj linie z priorytetem i trzymaj timery obiektów.'},
  mage:{order:['Q','W','E'],sums:[['Flash','Ignite'],['Flash','TP']],spikes:['Lvl 6 — all-in z ultem.','Pierwszy mityczny item/Rozdział — spam skilli i push.','2 itemy — teamfighty z backline.'],play:'Pushuj falę i roamuj z junglerem. W teamfightach stój z tyłu i wchodź skillami z dystansu.'},
  apAssassin:{order:['Q','W','E'],sums:[['Flash','Ignite']],spikes:['Lvl 6 — kill pressure.','1 item — roam i pick-offy.'],play:'Szukaj pick-offów na bocznych liniach, unikaj frontu w 5v5.'},
  adAssassin:{order:['Q','E','W'],sums:[['Flash','Ignite']],spikes:['Lvl 6 — all-in.','Dirk/1 item lethality — roam.'],play:'Wymuszaj trade po cooldownach wroga, roamuj po pushu.'},
  fighter:{order:['Q','E','W'],sums:[['Flash','TP'],['Flash','Ignite']],spikes:['Lvl 2/3 — mocne trade’y.','1 item — splitpush i 1v1.'],play:'Splitpushuj z TP, zmuszaj wroga do reakcji. Graj trade’y krótkie i pod minionami.'},
  tank:{order:['Q','E','W'],sums:[['Flash','TP']],spikes:['Lvl 6 — engage.','2 itemy defensywne — frontline.'],play:'Bądź przodem drużyny, inicjuj na carry wroga i chroń swoich.'},
  adc:{order:['Q','W','E'],sums:[['Flash','Barrier'],['Flash','Cleanse']],spikes:['2 itemy — realny DPS.','3 itemy — przejmujesz teamfighty.'],play:'Farm to priorytet. W walkach bij najbliższy cel, trzymaj się za frontem.'},
  enchanter:{order:['E','Q','W'],sums:[['Flash','Exhaust'],['Flash','Ignite']],spikes:['Lvl 2 — pierwszy trade.','Lvl 6 — ult ratujący carry.'],play:'Chroń ADC, wardy po każdym backu, nie stój z przodu bez wizji.'},
  tankSup:{order:['Q','W','E'],sums:[['Flash','Ignite'],['Flash','Exhaust']],spikes:['Lvl 2 — engage.','Lvl 6 — teamfight engage.'],play:'Roamuj do mida po pushu, kontroluj wizję wokół smoka.'},
}
// curated lane matchups per role (real lane opponents, not random)
const MU: Record<string,{easy:string[],hard:string[]}> = {
  ADC:{easy:['KogMaw','Aphelios','Jinx','Smolder','Senna'],hard:['Draven','Caitlyn','Lucian','Samira','Ashe']},
  Support:{easy:['Soraka','Sona','Yuumi','Taric','Janna'],hard:['Blitzcrank','Pyke','Nautilus','Leona','Braum']},
  Jungle:{easy:['Karthus','Fiddlesticks','Shyvana','Zyra','Brand'],hard:['LeeSin','XinZhao','Elise','RekSai','Nidalee']},
  midMage:{easy:['Veigar','Ryze','Azir','Viktor','Xerath'],hard:['Fizz','Zed','Yasuo','Katarina','Galio']},
  midAssassin:{easy:['Lux','Xerath','Ziggs','Velkoz','Veigar'],hard:['Malzahar','Lissandra','Galio','Vex','Fizz']},
  Top:{easy:['Garen','Yorick','Ornn','Sion','Nasus'],hard:['Fiora','Jax','Quinn','Teemo','Darius']},
}
const KIT: Record<string,string> = { Q:'0', W:'1', E:'2', R:'3' }
function guideOf(c: Champ, champs: Champ[]): Guide {
  if (GCUR[c.id]) return GCUR[c.id]
  const t = GTPL[c.role==='Jungle' ? 'jungle' : tplOf(c)] || GTPL.fighter
  const key = c.role==='Mid' ? (tplOf(c)==='mage' ? 'midMage' : 'midAssassin') : c.role, m = MU[key] || MU.Top, ok = new Set(champs.map(x=>x.id))
  const pick = (l: string[]) => l.filter(id => id!==c.id && ok.has(id)).slice(0,4)
  const sums = c.role==='ADC' ? GTPL.adc.sums : c.role==='Support' ? (tplOf(c)==='mage' ? [['Flash','Ignite'],['Flash','Exhaust']] as [string,string][] : t.sums) : c.role==='Top' ? [['Flash','TP'],['Flash','Ignite']] as [string,string][] : t.sums
  return { ...t, sums, easy: pick(m.easy), hard: pick(m.hard) }
}
// ---- Runy / clear / back / combo ----
type Rune = { p:string; k:string; pm:string[]; s:string; sm:string[]; why:string; n?:string; pr?:string }
const RTPL: Record<string,Rune> = {
  jungle:{p:'Precision',k:'Conqueror',pm:['Triumph','LegendAlacrity','CoupDeGrace'],s:'Domination',sm:['SixthSense','TreasureHunter'],why:'Conqueror do długich walk i skirmishy w jungli.'},
  jungleAD:{p:'Domination',k:'Electrocute',pm:['SuddenImpact','SixthSense','TreasureHunter'],s:'Precision',sm:['LegendAlacrity','CoupDeGrace'],why:'Burst pod ganki z lethality.'},
  jungleAP:{p:'Domination',k:'DarkHarvest',pm:['SuddenImpact','SixthSense','TreasureHunter'],s:'Sorcery',sm:['AbsoluteFocus','GatheringStorm'],why:'Dark Harvest skaluje z killami i resetami.'},
  jungleTank:{p:'Resolve',k:'Aftershock',pm:['FontOfLife','Conditioning','Unflinching'],s:'Precision',sm:['Triumph','LegendHaste'],why:'Aftershock = przeżywasz engage i robisz CC.'},
  mage:{p:'Sorcery',k:'ArcaneComet',pm:['ManaflowBand','Transcendence','Scorch'],s:'Inspiration',sm:['BiscuitDelivery','CosmicInsight'],why:'Comet do poke, Manaflow na manę w linii.'},
  apAssassin:{p:'Domination',k:'Electrocute',pm:['SuddenImpact','GrislyMementos','UltimateHunter'],s:'Sorcery',sm:['ManaflowBand','Transcendence'],why:'Electrocute = burst na all-in po 6.'},
  adAssassin:{p:'Domination',k:'Electrocute',pm:['SuddenImpact','GrislyMementos','TreasureHunter'],s:'Precision',sm:['Triumph','CoupDeGrace'],why:'Burst i roam po pierwszym itemie.'},
  fighter:{p:'Precision',k:'Conqueror',pm:['Triumph','LegendHaste','LastStand'],s:'Resolve',sm:['SecondWind','Unflinching'],why:'Conqueror do 1v1 i splitpusha.'},
  tank:{p:'Resolve',k:'GraspOfTheUndying',pm:['Demolish','SecondWind','Overgrowth'],s:'Inspiration',sm:['BiscuitDelivery','ApproachVelocity'],why:'Grasp do trade’ów i skalowania HP.'},
  adc:{p:'Precision',k:'LethalTempo',pm:['PresenceOfMind','LegendBloodline','CutDown'],s:'Inspiration',sm:['MagicalFootwear','BiscuitDelivery'],why:'Lethal Tempo pod DPS w teamfightach.'},
  enchanter:{p:'Sorcery',k:'SummonAery',pm:['ManaflowBand','Transcendence','Scorch'],s:'Resolve',sm:['FontOfLife','Revitalize'],why:'Aery = poke i mocniejsze tarcze/heale.'},
  tankSup:{p:'Resolve',k:'Aftershock',pm:['FontOfLife','BonePlating','Unflinching'],s:'Inspiration',sm:['HextechFlashtraption','CosmicInsight'],why:'Aftershock pod engage i przeżycie.'},
}
const RALT: Record<string,Rune> = {
  jungle:{n:'Alt',p:'Domination',k:'HailOfBlades',pm:['SuddenImpact','SixthSense','TreasureHunter'],s:'Precision',sm:['LegendAlacrity','CoupDeGrace'],why:'Hail of Blades pod szybkie ganki od 3 lvl.'},
  jungleAD:{n:'Alt',p:'Precision',k:'Conqueror',pm:['Triumph','LegendAlacrity','CoupDeGrace'],s:'Domination',sm:['SuddenImpact','TreasureHunter'],why:'Conqueror, gdy budujesz bruisersko.'},
  jungleAP:{n:'Alt',p:'Domination',k:'Electrocute',pm:['SuddenImpact','SixthSense','UltimateHunter'],s:'Sorcery',sm:['ManaflowBand','Transcendence'],why:'Electrocute = mocniejszy wczesny burst na ganku.'},
  jungleTank:{n:'Alt',p:'Inspiration',k:'GlacialAugment',pm:['HextechFlashtraption','MagicalFootwear','CosmicInsight'],s:'Resolve',sm:['BonePlating','Unflinching'],why:'Glacial pod spowolnienia i peel.'},
  mage:{n:'Alt',p:'Domination',k:'Electrocute',pm:['CheapShot','GrislyMementos','UltimateHunter'],s:'Sorcery',sm:['ManaflowBand','Transcendence'],why:'Electrocute do burstu i all-inów.'},
  apAssassin:{n:'Alt',p:'Sorcery',k:'PhaseRush',pm:['ManaflowBand','Transcendence','GatheringStorm'],s:'Domination',sm:['CheapShot','UltimateHunter'],why:'Phase Rush do kitingu i roamów.'},
  adAssassin:{n:'Alt',p:'Domination',k:'HailOfBlades',pm:['SuddenImpact','GrislyMementos','TreasureHunter'],s:'Precision',sm:['Triumph','LegendAlacrity'],why:'Hail of Blades = szybkie 3 auto po skillach.'},
  fighter:{n:'Alt',p:'Resolve',k:'GraspOfTheUndying',pm:['Demolish','SecondWind','Overgrowth'],s:'Precision',sm:['Triumph','LegendHaste'],why:'Grasp do krótkich trade’ów vs ranged.'},
  tank:{n:'Alt',p:'Resolve',k:'Aftershock',pm:['Demolish','BonePlating','Unflinching'],s:'Precision',sm:['Triumph','LegendHaste'],why:'Aftershock, gdy grasz pod engage w teamfightach.'},
  adc:{n:'Alt',p:'Precision',k:'PressTheAttack',pm:['PresenceOfMind','LegendBloodline','CoupDeGrace'],s:'Sorcery',sm:['AbsoluteFocus','GatheringStorm'],why:'Press the Attack na agresywny lane i krótki burst.'},
  enchanter:{n:'Alt',p:'Resolve',k:'Guardian',pm:['FontOfLife','BonePlating','Revitalize'],s:'Inspiration',sm:['BiscuitDelivery','CosmicInsight'],why:'Guardian vs dive/assasyni.'},
  tankSup:{n:'Alt',p:'Resolve',k:'GlacialAugment',pm:['FontOfLife','BonePlating','Unflinching'],s:'Inspiration',sm:['HextechFlashtraption','CosmicInsight'],why:'Glacial do peel i kontroli.'},
}
const RCUR2: Record<string,Rune[]> = {
  Hecarim:[{n:'Meta',pr:'~60%',p:'Sorcery',k:'PhaseRush',pm:['NimbusCloak','Celerity','Waterwalking'],s:'Precision',sm:['LegendHaste','Triumph'],why:'Stormraider’s Surge — prędkość po combo = ganki z Ghostem i wjazd/wyjazd z walki; Celerity skaluje z ruchem.'},
    {n:'Conqueror',pr:'~30%',p:'Precision',k:'Conqueror',pm:['Triumph','LegendHaste','LastStand'],s:'Sorcery',sm:['Celerity','Waterwalking'],why:'Dłuższe skirmishe i teamfighty z buildem Safe.'},
    {n:'Fleet Footwork',pr:'~10%',p:'Precision',k:'FleetFootwork',pm:['Triumph','LegendHaste','LastStand'],s:'Sorcery',sm:['Celerity','Waterwalking'],why:'Sustain w clearze i bezpieczniejszy early vs inwazje.'}],
  Rengar:[{n:'Meta',pr:'~55%',p:'Domination',k:'Electrocute',pm:['SuddenImpact','SixthSense','TreasureHunter'],s:'Precision',sm:['Triumph','CoupDeGrace'],why:'Electrocute + Sudden Impact = one-shot z krzaka.'},
    {n:'Conqueror',pr:'~30%',p:'Precision',k:'Conqueror',pm:['Triumph','LegendAlacrity','CoupDeGrace'],s:'Domination',sm:['SuddenImpact','TreasureHunter'],why:'Pod build Safe/bruiser — dłuższe walki i skirmishe.'},
    {n:'Hail of Blades',pr:'~10%',p:'Domination',k:'HailOfBlades',pm:['SuddenImpact','SixthSense','TreasureHunter'],s:'Precision',sm:['LegendAlacrity','CoupDeGrace'],why:'Szybkie 3 auto po skoku — wczesne ganki.'}],
  Twitch:[{n:'Meta',pr:'~60%',p:'Precision',k:'LethalTempo',pm:['PresenceOfMind','LegendBloodline','CutDown'],s:'Domination',sm:['SixthSense','TreasureHunter'],why:'Lethal Tempo do teamfightów z R; Treasure Hunter za roamy z Q.'},
    {n:'Hail of Blades',pr:'~25%',p:'Domination',k:'HailOfBlades',pm:['CheapShot','SixthSense','TreasureHunter'],s:'Precision',sm:['PresenceOfMind','CoupDeGrace'],why:'Burst z niewidzialności na flankach i roamach.'},
    {n:'Press the Attack',pr:'~15%',p:'Precision',k:'PressTheAttack',pm:['PresenceOfMind','LegendBloodline','CoupDeGrace'],s:'Inspiration',sm:['MagicalFootwear','BiscuitDelivery'],why:'Agresywny lane z enchanterem.'}],
}
type Plan = { clear:string[]; back:string[]; combo:{keys:string[], txt:string}[] }
const PTPL: Record<string,Plan> = {
  jungle:{clear:['Start: Czerwony buff (leash od bot/top) → Krugi → Raptory → Wilki → Niebieski → Gromp = full clear, lvl 4 ~3:15.','Alternatywa: 3-camp (Czerwony → Krugi → Raptory) i gank na lvl 3, gdy linia ma priorytet i wróg jest przepchnięty.','Skuttle 3:30 po stronie, gdzie Twoje linie mają priorytet.'],back:['Backuj po full clearze, gdy nie ma ganka z dobrą falą (wróg przepchnięty, bez Flasha) — kup komponent i wróć na drugi clear.','Gankuj, gdy linia ma CC/priorytet, a wróg stoi za daleko bez wardu.','Smok/Herold: 60 s przed respawnem bądź blisko, z Control Wardem.','Nie gankuj linii, która przegrywa i jest pod swoją wieżą bez setupu.'],combo:[]},
  lane:{clear:['Pierwsze 3 fale: last-hit, trade gdy wróg idzie po CS.','Slow push → crash fali przed backiem/roamem, żeby nie tracić XP.','Freeze pod swoją wieżą, gdy wróg jest mocniejszy lub jungler pokazał się blisko.'],back:['Backuj po crashu fali, gdy masz gold na komponent.','Roam (mid/supp) po pushu — tylko gdy wiesz, gdzie jest wrogi jungler.','Grupuj na obiekty z priorytetem linii, nie po stracie fali.','Niski HP + brak potek = back, nie walcz o 2 CS.'],combo:[]},
  adc:{clear:['Lvl 1–2 z supportem: push 1. fali na szybkie lvl 2.','Po tym: farm pod wieżą gdy przegrywacie, push i plate gdy wygrywacie.','Mid game: weź boczną falę, potem dołącz do grupy.'],back:['Backuj razem z supportem po pushu — nie zostawiaj go 1v2.','Przy ~1300 g back po B.F. Sword / komponent pierwszego itemu.','Nie face-checkuj krzaków bez wizji — od tego jest support.','Rotuj na smoka po pushu fali bot.'],combo:[]},
}
const CCUR: Record<string,{keys:string[],txt:string}[]> = {
  Hecarim:[{keys:['E','R','Q','W'],txt:'E (Szarża) z dystansu → R przez cel (strach) → Q spam → W w środku walki dla leczenia. Na gank: E z boku i odrzuć wroga w stronę swojej wieży/drużyny.'},{keys:['R','E','Q'],txt:'Engage w teamfight: R na grupę, potem E na carry i odrzut w swój team, Q dobija.'}],
  Rengar:[{keys:['R','Q','E','W'],txt:'R z mgły → skok na cel → Q (wzmocnione przy 4 ferocity) → E (root) → W na CC. Z krzaka skaczesz bez R.'},{keys:['Q','W','E'],txt:'Przed skokiem w krzaku ładuj ferocity, wzmocnione Q = burst, W = oczyszczenie CC.'}],
  Twitch:[{keys:['Q','R','E'],txt:'Q (niewidzialność) z flanki → wyjście z ataku speed → R (przebijające autoataki) → E przy 5–6 stackach.'},{keys:['W','E'],txt:'Lane: W (spowalnia) → kilka autoataków → E przy pełnych stackach.'}],
}
const PCUR: Record<string,Partial<Plan>> = {
  Hecarim:{clear:['Start: Czerwony buff (Q spam, leash) → Krugi → Raptory → Wilki → Niebieski → Gromp = full clear, lvl 4 ~3:10.','Alternatywnie Niebieski start i full clear w drugą stronę, kończąc przy linii, którą chcesz gankować.','Skuttle ~3:30 albo gank lvl 4 z E po stronie, gdzie linia ma priorytet. Drugi clear: kampy + Herold/Smok.']},
}
function planOf(c: Champ): Plan { const b = planOfBase(c); return PCUR[c.id] ? {...b, ...PCUR[c.id]} as Plan : b }
function planOfBase(c: Champ): Plan { const t = tplOf(c); return c.role==='Jungle' ? PTPL.jungle : t==='adc' ? PTPL.adc : PTPL.lane }
function comboOf(c: Champ, order: string[]) { if (CCUR[c.id]) return CCUR[c.id]; const [a,b] = order; return [{keys:[a,'E'===a?b:'E','R'].filter((x,i,arr)=>arr.indexOf(x)===i),txt:`Otwórz ${a}, dołóż drugi skill i dokończ R, gdy cel ma niski HP. Szukaj auto-ataków między skillami.`}] }
function tplKey(c: Champ): string { const t = tplOf(c); if (c.role!=='Jungle') return RTPL[t] ? t : 'fighter'; return t==='mage'||t==='apAssassin'||t==='apBruiser' ? 'jungleAP' : t==='tank' ? 'jungleTank' : t==='adAssassin' ? 'jungleAD' : 'jungle' }
function runesOf(c: Champ): Rune[] { if (RCUR2[c.id]) return RCUR2[c.id]; const k = tplKey(c); return [{...RTPL[k], n:'Meta'}, RALT[k]].filter(Boolean) }
function Poradnik({c, champs, ver, img}:{c:Champ, champs:Champ[], ver:string, img:(p:string)=>string}) {
  const [sp, setSp] = useState<{name:string, image:{full:string}}[]>([])
  useEffect(() => { if (!ver) return; fetch(`${DD}/cdn/${ver}/data/pl_PL/champion/${c.id}.json`).then(r=>r.json()).then(j=>setSp(j.data[c.id].spells)).catch(()=>setSp([])) }, [c.id, ver])
  const [rr, setRr] = useState<Record<string,{n:string,i:string}>>({})
  useEffect(() => { if (!ver) return; fetch(`${DD}/cdn/${ver}/data/pl_PL/runesReforged.json`).then(r=>r.json()).then((j:any[])=>{ const m:Record<string,{n:string,i:string}> = {}; for (const t of j) { m[t.key]={n:t.name,i:t.icon}; for (const sl of t.slots) for (const r of sl.runes) m[r.key]={n:r.name,i:r.icon} } setRr(m) }).catch(()=>{}) }, [ver])
  const rl = runesOf(c), [ri, setRi] = useState(0), ru = rl[Math.min(ri, rl.length-1)], pl = planOf(c)
  useEffect(() => setRi(0), [c.id])
  const R = (k: string, size=40) => <div className="rune" key={k}><Ico src={rr[k] ? `${DD}/cdn/img/${rr[k].i}` : ''} alt={rr[k]?.n || k} size={size}/><span>{rr[k]?.n || k}</span></div>
  const g = guideOf(c, champs), byId = new Map(champs.map(x=>[x.id,x]))
  const sk = (k: string) => { const s = sp[+KIT[k]]; return <div className="skill" title={s?.name}><Ico src={s ? img(`spell/${s.image.full}`) : ''} alt={s?.name || k} size={52}/><b>{k}</b></div> }
  const mu = (ids: string[]) => <div className="items">{ids.map(id => { const x = byId.get(id); return x ? <div key={id} className="item"><Ico src={img(`champion/${id}.png`)} alt={x.pl}/><span>{x.pl}</span></div> : null })}</div>
  return <div className="poradnik">
    <h3>Kolejność skilli</h3>
    <div className="skillorder">{sk('R')}<span className="muted">gdy możliwe, potem</span>{g.order.map((k,i)=><span key={k} style={{display:'contents'}}>{i>0 && <span className="arrow">→</span>}{sk(k)}</span>)}</div>
    <p className="muted">Maksuj {g.order.join(' → ')}; R na 6 / 11 / 16 lvl.</p>
    <h3>Runy</h3>
    <div className="rpills">{rl.map((r,i)=><button key={i} className={'rpill'+(i===ri?' on':'')} onClick={()=>setRi(i)}><Ico src={rr[r.k] ? `${DD}/cdn/img/${rr[r.k].i}` : ''} alt={rr[r.k]?.n || r.k} size={30}/><span><b>{r.n}</b><small>{rr[r.k]?.n || r.k}{r.pr ? ` · ${r.pr} gier` : ''}</small></span></button>)}</div>
    <div className="runes"><div className="rtree"><h4>{R(ru.p,28)}</h4><div className="keystone">{R(ru.k,64)}</div>{ru.pm.map(k=>R(k))}</div>
      <div className="rtree"><h4>{R(ru.s,28)}</h4>{ru.sm.map(k=>R(k))}<p className="muted">Odłamki: {c.role==='Support'||tplOf(c)==='tank'?'Haste / Adaptive / HP':'Atak / Adaptive / HP'}</p></div></div>
    <p className="tip">🔮 {ru.why}</p>
    <h3>Summonerki</h3>
    <div className="items">{g.sums.map((pair,i)=><div key={i} className="item sumpair"><div className="sumicons">{pair.map(n=>{ const sm = SUM[n]; return <Ico key={n} src={ver && sm ? `${DD}/cdn/${ver}/img/spell/${sm[0]}.png` : ''} alt={sm?.[1]||n} size={40}/> })}</div><span>{pair.map(n=>SUM[n]?.[1]||n).join(' + ')}{i===0?' (główne)':' (alternatywa)'}</span></div>)}</div>
    <h3>Matchupy</h3>
    <div className="mu"><div><h4 className="mu-easy">✅ Łatwe</h4>{mu(g.easy)}</div><div><h4 className="mu-hard">⚠️ Trudne</h4>{mu(g.hard)}</div></div>
    <h3>{c.role==='Jungle'?'Ścieżka clearu':'Farma i fale'}</h3><ol className="steps">{pl.clear.map((x,i)=><li key={i}>{x}</li>)}</ol>
    <h3>Back czy gank/roam?</h3><ul className="spikes decide">{pl.back.map((x,i)=><li key={i}>{x}</li>)}</ul>
    <h3>Combo</h3><div className="combos">{comboOf(c, g.order).map((cb,i)=><div key={i} className="combo"><div className="skillorder">{cb.keys.map((k,j)=><span key={j} style={{display:'contents'}}>{j>0&&<span className="arrow">→</span>}{sk(k)}</span>)}</div><p>{cb.txt}</p></div>)}</div>
    <h3>Power spiki</h3><ul className="spikes">{g.spikes.map((x,i)=><li key={i}>{x}</li>)}</ul>
    <h3>Jak grać</h3><p className="tip">🎯 {g.play}</p>
    {!GCUR[c.id] && <p className="muted" style={{fontSize:12}}>Poradnik ogólny dla roli — szczegółowy wkrótce.</p>}
  </div>
}

export default function Guides() {
  const [pl, setPl] = useState<OtpPlayer|null>(null), [tab, setTab] = useState<'build'|'guide'>('build')
  const [otpRows, setOtpRows] = useState<OtpPlayer[]>([])
  const [otpSt, setOtpSt] = useState<'idle'|'load'|'ok'|'err'>('idle')
  const [ver, setVer] = useState(''), [champs, setChamps] = useState<Champ[]>([]), [items, setItems] = useState<Item[]>([])
  const [err, setErr] = useState(''), [q, setQ] = useState(''), [role, setRole] = useState<Role|'Wszystkie'>('Wszystkie')
  const [sel, setSel] = useState<Champ|null>(null), [rank, setRank] = useState(3), [v, setV] = useState<Variant>('meta')
  useEffect(() => {
    const key = sel?.key
    if (!key) return
    let alive = true
    api<{ players?: unknown }>(`/api/champions/${encodeURIComponent(key)}/otp`)
      .then(j => { if (!alive) return; setOtpRows(topOtps(j)); setOtpSt('ok') })
      .catch(() => { if (!alive) return; setOtpRows([]); setOtpSt('err') })
    return () => { alive = false }
  }, [sel?.key])
  useEffect(() => { (async () => {
    try {
      const vv: string = (await (await fetch(`${DD}/api/versions.json`)).json())[0]; setVer(vv)
      const [cj, ij] = await Promise.all([fetch(`${DD}/cdn/${vv}/data/pl_PL/champion.json`).then(r => r.json()), fetch(`${DD}/cdn/${vv}/data/pl_PL/item.json`).then(r => r.json())])
      setChamps(Object.values(cj.data as Record<string, any>).map(c => ({ id:c.id, key:c.key, pl:c.name, title:c.title, tags:c.tags, role:roleOf(c.id, c.tags), diff:c.info.difficulty || 5 })).sort((a, b) => a.pl.localeCompare(b.pl, 'pl')))
      setItems(Object.entries(ij.data as Record<string, any>).filter(([id, i]) => id.length <= 4 && i.gold?.purchasable && i.maps?.['11'])
        .map(([id, i]) => ({ id, name:i.name, gold:i.gold.total, tags:i.tags || [], boots:i.tags?.includes('Boots') })))
    } catch { setErr('Nie udało się pobrać danych z Data Dragon. Sprawdź internet.') }
  })() }, [])
  const list = useMemo(() => champs.filter(c => (role==='Wszystkie' || c.role===role) && (c.pl+' '+c.id+' '+c.title).toLowerCase().includes(q.toLowerCase())), [champs, q, role])
  const [patch, setPatch] = useState(''), [ugg, setUgg] = useState<Record<string, Ugg|null>>({})
  useEffect(() => { if (ver) uggPatch(ver).then(setPatch) }, [ver])
  useEffect(() => { if (!patch || !champs.length) return; let alive = true; const q2 = [...champs]
    const work = async () => { while (alive && q2.length) { const c = q2.shift()!; const d = await uggChamp(patch, c.key); if (alive) setUgg(u => ({ ...u, [c.id]: d })) } }
    for (let i = 0; i < 8; i++) work(); return () => { alive = false } }, [patch, champs])
  const roleTotals = useMemo(() => { const t: Record<string, number> = {}; for (const d of Object.values(ugg)) { const r = d?.[UGG_RANK[rank]]; if (r) for (const [ro, a] of Object.entries(r)) t[ro] = (t[ro]||0) + (a?.[1]||0) } return t }, [ugg, rank])
  const live = (c: Champ) => { const r = ugg[c.id]?.[UGG_RANK[rank]]; if (!r) return null
    let ro = UGG_ROLE[c.role], a = r[ro]; const best = Object.entries(r).sort((x, y) => (y[1]?.[1]||0) - (x[1]?.[1]||0))[0]; if (!a || a[1] < 200) { ro = best[0]; a = best[1] }
    if (!a || !a[1]) return null; const wr = a[0]/a[1]*100, games = roleTotals[ro] ? roleTotals[ro]/2 : 0, pr = games ? a[1]/games*100 : 0
    return { wr: wr.toFixed(1), pr: pr.toFixed(1), games: a[1], tier: tierOf(wr, pr) } }
  const img = (p: string) => `${DD}/cdn/${ver}/img/${p}`
  const rankBar = <div className="roles">{RANKS.map((r, k) => <button key={r} className={rank===k?'pill active':'pill'} onClick={() => setRank(k)}>{r}</button>)}</div>
  const note = <p className="muted" style={{fontSize:12,opacity:.7}}>{`Patch ${ver || '…'} · Data Dragon · ${Object.values(ugg).some(Boolean) ? `statystyki ranked (patch ${patch.replace('_','.')}, świat)` : 'statystyki poglądowe'}`}</p>
  if (sel) {
    const c = sel, L = live(c), f = stats(c, rank, v), s = L ? { ...f, wr: L.wr, pr: L.pr, games: L.games } : f, tr = L?.tier || tierOf(+f.wr, +f.pr), b = build(c, items, v, rank), e = early(c), im = new Map(items.map(i => [i.id, i])), row = (ids: string[]) => <div className="items">{ids.map((id, k) => { const it = im.get(id); return it ? <div key={id+k} className="item" title={`${it.gold} g`}><img src={img(`item/${id}.png`)} alt={it.name} /><span>{it.name} · {it.gold} g</span></div> : null })}</div>
    return (
      <div className="glass guide">
        <button className="pill" onClick={() => { setSel(null); setPl(null); setOtpRows([]); setOtpSt('idle'); setTab('build') }}>← Wróć do listy</button>
        <div className="ghead">
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}><img className="gicon big" src={img(`champion/${c.id}.png`)} alt={c.pl} /><span className={'tier '+tr}>{tr}</span></div>
          <div><h1>{c.pl}</h1><p className="muted">{c.title} · {c.role} · {c.tags.join(' / ')}</p></div>
        </div>
        <div className="roles tabs">{([['build','🛠️ Build'],['guide','📖 Poradnik']] as const).map(([k,n]) => <button key={k} className={tab===k?'pill active':'pill'} onClick={() => setTab(k)}>{n}</button>)}</div>
        {tab==='guide' ? <Poradnik c={c} champs={champs} ver={ver} img={img}/> : <>
        <h3>Ranga</h3>{rankBar}
        <div className="roles" style={{gap:16,margin:'12px 0'}}>
          <div className="item"><b style={{fontSize:22}}>{s.wr}%</b><span>Win rate</span></div>
          <div className="item"><b style={{fontSize:22}}>{s.pr}%</b><span>Pick rate</span></div>
          <div className="item"><b style={{fontSize:22}}>{s.br}%</b><span>Ban rate{L?' (szac.)':''}</span></div>
          <div className="item"><b style={{fontSize:22}}>{s.games.toLocaleString('pl')}</b><span>Gier{L?'':' (poglądowo)'}</span></div>
        </div>
        <h3>Na start</h3>{row(e.start)}
        <h3>Pierwszy back</h3>{row(e.back)}
        <h3>Build</h3>
        <div className="roles">{(Object.keys(VNAME) as Variant[]).map(k => <button key={k} className={v===k?'pill active':'pill'} onClick={() => setV(k)}>{VNAME[k]}</button>)}</div>
        <div className="items build-row"><div className="build-main">{b.filter(it => !it.boots).map((it, k) => (
          <div key={it.id} className="item" title={`${it.gold} g`}><b className="bnum">{k+1}</b><img src={img(`item/${it.id}.png`)} alt={it.name} /><span>{it.name}</span></div>
        ))}</div><div className="build-boots">{b.filter(it => it.boots).map(it => (
          <div key={it.id} className="item" title={`${it.gold} g`}><img src={img(`item/${it.id}.png`)} alt={it.name} /><span>{it.name}</span><small className="muted">Buty</small></div>
        ))}</div></div>
        <h3>Wskazówka</h3><p className="tip">💡 {TIPS[c.id] || `${c.pl} (${c.tags.join('/')}) — ${c.diff>=7?'trudny champion, ćwicz combo w trybie treningowym.':'graj pod swoje power spiki i farm.'}`}</p>
        <h3>🏆 Top 3 onetricków (świat)</h3>
        {(otpSt === 'load' || otpSt === 'idle') && <p className="muted">Ładowanie onetricków…</p>}
        {otpSt === 'err' && <p className="muted">Nie udało się pobrać rankingu.</p>}
        {otpSt === 'ok' && !otpRows.length && <p className="muted">Brak onetricków.</p>}
        {otpSt === 'ok' && otpRows.length > 0 && <div className="otps">{otpRows.map((o, i) => (
          <div key={`${o.region}:${riotId(o)}:${i}`} className="otp"><b className="otpn">#{i + 1}</b><div><button className="otpl" onClick={() => setPl(o)} title="Pokaż profil gracza"><b>{riotId(o)}</b></button> <small className="muted">{shortRegion(o.region)}</small><br /><small>{fmtTier(o.tier, o.rank)} · <b>{Math.round(o.lp)} LP</b></small></div><div className="otps-r"><b>WR {fmtWr(o.winRate)}%</b><br /><small className="muted">{o.games.toLocaleString('pl')} gier</small></div></div>))}
        </div>}</>}
        {note}
        {pl && <PlayerModal key={`${pl.region}:${riotId(pl)}`} o={pl} c={c} ver={ver} close={() => setPl(null)} />}
      </div>
    )
  }
  return (
    <div className="glass guide">
      <h1>Poradniki + buildy</h1>
      <input className="search" placeholder="Szukaj bohatera…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="roles">{ROLES.map(r => <button key={r} className={role===r?'pill active':'pill'} onClick={() => setRole(r)}>{r}</button>)}</div>
      {rankBar}{note}
      {err && <p className="muted">{err}</p>}
      {!champs.length && !err && <p className="muted">Ładowanie championów…</p>}
      <div className="grid">
        {list.map(c => { const L = live(c), f = stats(c, rank, 'meta'), s = L || f, tr = L?.tier || tierOf(+f.wr, +f.pr); return (
          <button key={c.id} className="card" onClick={() => { setSel(c); setV('meta'); setPl(null); setOtpRows([]); setOtpSt('load') }}>
            <img className="gicon" src={img(`champion/${c.id}.png`)} alt={c.pl} loading="lazy" /><span className={'tier '+tr}>{tr}</span>
            <b>{c.pl}</b><small>{c.role}</small><small>WR {s.wr}% · PR {s.pr}%</small>
          </button>) })}
        {champs.length > 0 && !list.length && <p className="muted">Brak wyników.</p>}
      </div>
    </div>
  )
}
