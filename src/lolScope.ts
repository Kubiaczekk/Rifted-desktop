// LoL-only intent check for AI pomoc.
// Champion names (Polish declension and one-character typos included) and
// short follow-ups in an ongoing LoL thread stay in scope. A real topic
// change stays blocked even after a LoL question.

export type AnswerCtx = { priorUser?: string[]; lastAi?: string }

const REJECT = 'Odpowiadam tylko na pytania o League of Legends 🙂 Zapytaj np. o build, runy, matchup, makro albo jak wyjść z elo.'
const BUILD_ASK = 'Podaj championa i rolę, a rozpiszę start, pierwszy back i core. Pełne buildy znajdziesz też w zakładce Poradniki.'
const ELO = 'Na wyjście z elo: 1–2 role, 2–3 championów, CS 7+/min, ward na rzece przed 3:00, gramy wokół obiektów i mutujemy toksyczny chat.'
const FARM = 'Farm: celuj w 80 CS na 10 min. Ćwicz last hit w Practice Tool, pod wieżą: melee 2 strzały wieży + hit, caster hit + wieża + hit.'
const WARD = 'Wizja: kup Control Ward przy każdym backu, wardy na rzece/tribush przed obiektami, zmień trinket na Oracle jako support/jungler.'
const OBJ = 'Obiekty: zbieraj prio na botlane/midzie 45–60 s przed spawnem, ustaw wizję i dopiero wtedy start. Baron po wygranym teamfighcie lub pick.'
const RUNE = 'Runy dobieraj do roli: Conqueror dla bruiserów, Electrocute dla burst, Lethal Tempo/PTA dla ADC, Aery/Guardian dla supportów. Podaj championa, dam konkret.'
const JUNGLE = 'Jungla: gankuj linie z prio i slowami/CC, unikaj linii bez wizji. Śledź enemy junglera z pierwszego clearu i rób kontr-ganki.'
const GENERIC = 'Dobre pytanie z LoLa! Doprecyzuj championa, rolę albo sytuację (lane/makro/teamfight), a dam konkretną radę.'
const MACRO = 'Makro: pushnij falę przed obiektem, ustaw wizję 45–60 s wcześniej i graj wokół smoka, Herolda i Barona. Nie oddawaj darmowych killi na bocznej — roam i TP na wygraną linię są ważniejsze niż jedna fala.'

const BLURB: Record<string, string> = {
  Hecarim: 'Hecarim (jungle): Shojin → Death\'s Dance → Bezustanny Głód, buty Lucidity. Runy: Stormraider, Q>W>E. Szukaj ganków z Ghostem + E na flankę.',
  Draven: 'Draven: łap topory w miejscu, gdzie i tak chcesz stać. Wczesny trade lv2–3, Bloodthirster/IE pierwszy, Flash+Barrier/Heal.',
  Kassadin: 'Kassadin: przetrwaj do 6 i 11 lvl, farm spokojnie, Rod of Ages → Lich Bane. Siła rośnie z czasem gry — nie forsuj early.',
  Twitch: 'Twitch: wykorzystuj Q do roamów i flankowania w teamfightach, Ult z bezpiecznej pozycji za frontem.',
  Graves: 'Graves: szybki full clear, tempo gank albo invade. Lethality (Collector/Youmuu) dla jungle, pilnuj ammo i E na resety.',
  Katarina: 'Katarina (mid): start Pierścień Dorana + mikstura, pierwszy back Alternator Hextech. Core: Przepływ Burzy → Płomień Cienia → Klepsydra Zhonyi, buty Obuwie Maga. Runy: Electrocute albo Conqueror, skill Q>E>W. Wchodź na sztyletach i resetuj po killu. Pełne warianty (meta, burst, safe) są w zakładce Poradniki.',
}

// Common Polish/English words that are also champion names.
const AMBIGUOUS = new Set(['Nami', 'Talon', 'Karma', 'Brand', 'Lux'])

const FILLER = new Set(`a i o u w we z ze na do od dla po przy
ten ta to te tej tego tym tamten tamta sam sama samo tez tak nie ok okej no
prosze poprosze jeszcze bardziej dokladniej konkretniej
pierwszy pierwsza drugi druga oba obie
ona on jej jego niej niego mu ja ty my wy oni one ich im mi ci go mnie cie nas was
co jak czy jaki jaka jakie jakim jakiego yy y`.split(/\s+/))

const PLAY = new Set('gram grac graj grywam grajcie gramy zagram zagraj main mainuje chce chcialbym chcialabym lubie uwielbiam biore wybieram pickuje otp'.split(' '))

const SUFFIXES = ['ami', 'ach', 'owi', 'ego', 'em', 'om', 'ow', 'ie', 'a', 'y', 'e', 'i', 'u']

const ROWS = `
Aatrox
Ahri
Akali
Akshan
Alistar|ali
Ambessa
Amumu
Anivia
Annie
Aphelios
Ashe
Aurelion Sol|asol,aurelion
Aurora
Azir
Bard
Bel'Veth
Blitzcrank|blitz
Brand
Braum
Briar
Caitlyn
Camille
Cassiopeia|cass
Cho'Gath|cho
Corki
Darius
Diana
Draven|dravenem
Dr. Mundo|mundo,drmundo
Ekko
Elise
Evelynn|eve
Ezreal
Fiddlesticks|fiddle
Fiora
Fizz
Galio
Gangplank|gp
Garen
Gnar
Gragas
Graves
Gwen
Hecarim|heca,hecarima
Heimerdinger|heimer
Hwei
Illaoi
Irelia
Ivern
Janna
Jarvan IV|j4,jarvan
Jax
Jayce
Jhin
Jinx
Kai'Sa
Kalista
Karma
Karthus
Kassadin|kass,kassa
Katarina|kata,katarine,katarinie,katariny,katarino
Kayle
Kayn
Kennen
Kha'Zix|kha
Kindred
Kled
Kog'Maw|kog
K'Sante
LeBlanc|lb
Lee Sin|lee
Leona
Lillia
Lissandra
Locke
Lucian
Lulu
Lux
Malphite
Malzahar
Maokai
Master Yi|yi
Mel
Milio
Miss Fortune|mf
Wukong|monkeyking
Mordekaiser|morde
Morgana
Naafiri
Nami
Nasus
Nautilus
Neeko
Nidalee
Nilah
Nocturne|noc
Nunu & Willump|nunu,willump
Olaf
Orianna
Ornn
Pantheon|panth
Poppy
Pyke
Qiyana
Quinn
Rakan
Rammus
Rek'Sai
Rell
Renata Glasc|renata
Renekton
Rengar
Riven
Rumble
Ryze
Samira
Sejuani|sej
Senna
Seraphine
Sett
Shaco
Shen
Shyvana
Singed
Sion
Sivir
Skarner
Smolder
Sona
Soraka
Swain
Sylas
Syndra
Tahm Kench|tahm,kench
Taliyah
Talon
Taric
Teemo
Thresh
Tristana|trist
Trundle
Tryndamere|trynd,trynda
Twisted Fate
Twitch
Udyr
Urgot
Varus
Vayne
Veigar
Vel'Koz
Vex
Vi
Viego
Viktor
Vladimir|vlad
Volibear|voli
Warwick|ww
Xayah
Xerath
Xin Zhao|xin
Yasuo|yas
Yone
Yorick
Yunara
Yuumi
Zaahen
Zac
Zed
Zeri
Ziggs
Zilean
Zoe
Zyra
`.trim().split('\n')

type Hit = { name: string; weak: boolean }

const FULL = new Set<string>()
const EXACT = new Map<string, string>()
const FUZZY: { key: string; name: string }[] = []

function fold(s: string): string {
  return s.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/\p{M}/gu, '')
}
function keyOf(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '')
}
function tokens(s: string): string[] {
  return fold(s).replace(/['’`´.]/g, '').split(/[^a-z0-9]+/).filter(Boolean)
}
function addKey(key: string, name: string, fuzzy: boolean) {
  if (!key) return
  const prev = EXACT.get(key)
  if (prev && prev !== name) throw new Error(`LoL champ key clash "${key}": ${prev} vs ${name}`)
  if (!prev) EXACT.set(key, name)
  if (fuzzy && key.length >= 5 && !FUZZY.some(f => f.key === key)) FUZZY.push({ key, name })
}
for (const row of ROWS) {
  const [display, extra] = row.split('|')
  const name = display.trim()
  const full = keyOf(name)
  FULL.add(full)
  addKey(full, name, true)
  for (const alias of (extra ?? '').split(',').map(s => s.trim()).filter(Boolean)) addKey(keyOf(alias), name, alias.length >= 6)
}

const KEYWORD = new RegExp([
  String.raw`\blol\b`, String.raw`\bleague\b`, String.raw`\blegend\w*`,
  String.raw`\bchamp\b`, String.raw`\bchampie\b`, String.raw`\bchampem\b`, String.raw`\bchampa\b`, String.raw`\bchampy\b`,
  String.raw`\bchampion(?:ami|ach|owi|ow\w*|em|om|ie|a|y|i)?\b`,
  String.raw`\bpostac\w*`, String.raw`\bbuild(?:em|ow\w*|zie|y|a|u)?\b`, String.raw`\bitem\w*`, String.raw`\bprzedmiot\w*`,
  String.raw`\brun[ay]\w*`, String.raw`\brune\w*`, String.raw`\blane\b`,
  String.raw`\blini(?:a|i|e|ach|om|ami)\b`,
  String.raw`\bgank\w*`, String.raw`\bsmite\b`, String.raw`\bflash\w*`, String.raw`\bignite\b`, String.raw`\bghost\b`,
  String.raw`\bbarrier\w*`, String.raw`\bteleport\w*`, String.raw`\btp\b`, String.raw`\btpk\w*`,
  String.raw`\bult\b`, String.raw`\bulta\b`, String.raw`\bultem\b`, String.raw`\bulti\w*`,
  String.raw`\bskill\w*`, String.raw`\bcombo\w*`, String.raw`\bmatch\s*up\w*`, String.raw`\bcounter\w*`,
  String.raw`\bkontr(?:atak\w*|uj\w*|ze|a|y)\b`, String.raw`\btier\w*`,
  String.raw`\bmeta\b`, String.raw`\bmety\b`, String.raw`\bmete\b`, String.raw`\bmecie\b`,
  String.raw`\bpatch\w*`, String.raw`\branked\w*`, String.raw`\branking\w*`, String.raw`\brank\b`, String.raw`\brang(?:ami|ach|om|em|a|e|i)?\b`, String.raw`\brandze\b`,
  String.raw`\belo\b`, String.raw`\blp\b`, String.raw`\biron\b`,
  String.raw`\bzelazo\b`, String.raw`\bzelaza\b`, String.raw`\bzelazie\b`,
  String.raw`\bbronze\w*`, String.raw`\bbraz\b`, String.raw`\bbrazie\b`, String.raw`\bbraza\b`,
  String.raw`\bsilver\w*`, String.raw`\bsrebro\b`, String.raw`\bsrebra\b`, String.raw`\bsrebrze\b`,
  String.raw`\bgold\w*`, String.raw`\bzlot[oaey]\b`,
  String.raw`\bplat\b`, String.raw`\bplatyn\w*`, String.raw`\bemerald\w*`, String.raw`\bszmaragd\w*`,
  String.raw`\bdiament\w*`, String.raw`\bdiamond\w*`,
  String.raw`\bmaster\b`, String.raw`\bmaster[ayz]\w*`, String.raw`\bmasterem\b`, String.raw`\bmasterow\w*`,
  String.raw`\bchallenger\w*`, String.raw`\bchall\b`, String.raw`\bgrandmaster\w*`,
  String.raw`\bbaron\w*`, String.raw`\bsmok(?:iem|owi|ami|ach|ow\w*|om|u|a|i)?\b`, String.raw`\bsmocz\w*`, String.raw`\bdragon\w*`, String.raw`\bherald\w*`, String.raw`\bherold\w*`,
  String.raw`\bwiez(?:a|e|y|ami|ach|om)\b`, String.raw`\bturret\w*`, String.raw`\bnexus\w*`, String.raw`\bminion\w*`,
  String.raw`\bcs\b`, String.raw`\bfarm(?!ac)\w*`,
  String.raw`\bward(?:ow\w*|uj\w*|y|a|em|zie)?\b`, String.raw`\bwizj\w*`, String.raw`\bvision\w*`,
  String.raw`\bteam\s*fight\w*`, String.raw`\bsplit\w*`, String.raw`\broam\w*`,
  String.raw`\bback\b`, String.raw`\bbacku\b`, String.raw`\bbackiem\b`, String.raw`\bbacka\b`, String.raw`\brecall\w*`,
  String.raw`\bzhony\w*`, String.raw`\bshojin\w*`, String.raw`\beclipse\w*`, String.raw`\btrinity\w*`, String.raw`\btrynity\w*`,
  String.raw`\brift\w*`, String.raw`\baram\b`, String.raw`\barena\w*`, String.raw`\bsummoner\w*`,
  String.raw`\bmakro\b`, String.raw`\bmakra\b`, String.raw`\bmacro\b`, String.raw`\bporadnik\w*`,
  String.raw`\bobiekt(?:owi|ami|ach|ow\w*|em|om|y|u)?\b`,
  String.raw`\bpogneb\w*`, String.raw`\bpodpaleni\w*`,
].join('|'), 'i')

const OFF = new RegExp([
  String.raw`\bpogod\w*`, String.raw`\bdeszcz\w*`, String.raw`\bslonce\b`, String.raw`\bpizz\w*`,
  String.raw`\bprzepis\w*`, String.raw`\bgotowac\b`, String.raw`\bgotowani\w*`, String.raw`\bobiad\w*`,
  String.raw`\bsniadani\w*`, String.raw`\bkolacj\w*`, String.raw`\bciast\w*`, String.raw`\bfilm\w*`,
  String.raw`\bserial\w*`, String.raw`\bnetflix\b`, String.raw`\byoutube\w*`, String.raw`\bpython\w*`,
  String.raw`\bjavascript\w*`, String.raw`\btypescript\w*`, String.raw`\bjava\b`, String.raw`\bprogramow\w*`,
  String.raw`\bszkol\w*`, String.raw`\blekcj\w*`, String.raw`\bmatematy\w*`, String.raw`\bfizyk\w*`,
  String.raw`\bchemi\w*`, String.raw`\bpolity\w*`, String.raw`\bbitcoin\w*`, String.raw`\bkrypto\w*`,
  String.raw`\bpilk\w*`, String.raw`\bnozn\w*`, String.raw`\bkoszykowk\w*`, String.raw`\bsamochod\w*`,
  String.raw`\bmoda\b`, String.raw`\bdowcip\w*`,
].join('|'), 'i')

function hasKeyword(folded: string): boolean {
  return KEYWORD.test(folded)
}
function hasOff(text: string): boolean {
  return OFF.test(fold(text))
}
function within1(a: string, b: string): boolean {
  if (a === b) return true
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > 1) return false
  let i = 0
  let j = 0
  let used = false
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (used) return false
    used = true
    if (la === lb) { i++; j++ }
    else if (la > lb) i++
    else j++
  }
  if (i < la || j < lb) return !used
  return true
}
function inflect(token: string): string | null {
  for (const suf of SUFFIXES) {
    if (token.length < suf.length + 3 || !token.endsWith(suf)) continue
    const stem = token.slice(0, -suf.length)
    const direct = EXACT.get(stem)
    if (direct) return direct
    if (stem.length < 4) continue
    let hit: string | null = null
    let clash = false
    for (const ch of 'aeiounsry') {
      const name = EXACT.get(stem + ch)
      if (!name) continue
      if (hit && hit !== name) { clash = true; break }
      hit = name
    }
    if (hit && !clash) return hit
  }
  return null
}
function fuzzy(token: string): string | null {
  let name: string | null = null
  for (const row of FUZZY) {
    if (Math.abs(row.key.length - token.length) > 1) continue
    if (!within1(token, row.key)) continue
    if (name && name !== row.name) return null
    name = row.name
  }
  return name
}
function matchToken(raw: string): Hit | null {
  if (!raw) return null
  const exact = EXACT.get(raw)
  if (exact) return { name: exact, weak: raw.length <= 3 && !FULL.has(raw) }
  if (raw.length >= 5) {
    const inf = inflect(raw)
    if (inf) return { name: inf, weak: false }
  }
  if (hasKeyword(raw) || FILLER.has(raw) || PLAY.has(raw)) return null
  if (raw.length >= 6) {
    const name = fuzzy(raw)
    if (name) return { name, weak: false }
  }
  return null
}
function allHits(text: string): Hit[] {
  const toks = tokens(text)
  const out: Hit[] = []
  const push = (h: Hit | null) => {
    if (!h) return
    const i = out.findIndex(x => x.name === h.name)
    if (i === -1) out.push(h)
    else if (out[i].weak && !h.weak) out[i] = h
  }
  for (let i = 0; i < toks.length; i++) {
    if (i + 1 < toks.length) push(matchToken(toks[i] + toks[i + 1]))
    push(matchToken(toks[i]))
  }
  return out
}
export function findRole(text: string): 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'bot' | null {
  const t = fold(text)
  if (/\b(support\w*|wspar\w*|supp)\b/.test(t)) return 'support'
  if (/\b(adcarry|adc|strzelcem|strzelca|strzelec)\b/.test(t)) return 'adc'
  if (/\b(jungl\w*|dzungl\w*|jng|jg)\b/.test(t)) return 'jungle'
  if (/\b(midlane\w*|midzie|midem|mida|mid|srodkow\w*|srodku|srodka|srodek)\b/.test(t)) return 'mid'
  if (/\b(toplane\w*|topk\w*|topie|topem|topa|top)\b/.test(t) || /\bgorn\w*\s+lini\w*/.test(t)) return 'top'
  if (/\b(botlane\w*|bocie|botem|bota|bot)\b/.test(t) || /\bdoln\w*\s+lini\w*/.test(t)) return 'bot'
  return null
}
function tokenMeans(token: string, name: string): boolean {
  return matchToken(token)?.name === name
}
export function championMention(text: string): string | null {
  const hits = allHits(text)
  if (!hits.length) return null
  const ok = (h: Hit) => {
    if (!h.weak && !AMBIGUOUS.has(h.name)) return true
    if (hasKeyword(fold(text)) || findRole(text)) return true
    if (hits.some(o => o.name !== h.name)) return true
    const others = tokens(text).filter(t => !FILLER.has(t) && !PLAY.has(t) && !tokenMeans(t, h.name))
    return others.length === 0
  }
  return hits.find(ok)?.name ?? null
}
function mentionsLol(text: string): boolean {
  return hasKeyword(fold(text)) || findRole(text) !== null || championMention(text) !== null
}
function isContinuation(text: string): boolean {
  const toks = tokens(text)
  return toks.length > 0 && toks.length <= 4 && toks.every(t => FILLER.has(t))
}
function strongOther(q: string): boolean {
  const s = q.toLowerCase()
  return /(elo|rang|ranked|lp|wyj[sś]ć|farm|ward|wizj|vision|smok|dragon|baron|herald)/.test(s) || /\b(herold|obiekt)\b/.test(fold(q))
}
function inheritChamp(q: string, prior: string[]): string | null {
  if (championMention(q) || strongOther(q)) return null
  const s = q.toLowerCase()
  const related = findRole(q) !== null || isContinuation(q) || /(build|item|przedmiot|run|rune|matchup|counter|kontr)/.test(s)
  if (!related) return null
  for (let i = prior.length - 1; i >= 0; i--) {
    const c = championMention(prior[i])
    if (c) return c
  }
  return null
}
function inScope(text: string, prior: string[], lastAi: string): boolean {
  if (hasOff(text) && !mentionsLol(text)) return false
  if (mentionsLol(text)) return true
  if (/Odpowiadam tylko/.test(lastAi)) return false
  if (!isContinuation(text)) return false
  return prior.some(p => mentionsLol(p))
}
function guide(name: string, role: string | null): string {
  if (role) return `${name} (${role}): start, pierwszy back i core (warianty meta, burst i safe) są w zakładce Poradniki — wybierz ${name}.`
  return `${name}: start, pierwszy back i core są w zakładce Poradniki — wybierz ${name}. Napisz rolę (top, jungle, mid, adc albo support), to wskażę wariant.`
}
function speak(name: string, role: string | null): string {
  return BLURB[name] ?? guide(name, role)
}

export function answer(q: string, ctx: AnswerCtx = {}): string {
  const prior = ctx.priorUser ?? []
  const lastAi = ctx.lastAi ?? ''
  if (!inScope(q, prior, lastAi)) return REJECT
  const s = q.toLowerCase()
  const now = championMention(q)
  const inherited = now ? null : inheritChamp(q, prior)
  const role = findRole(q) ?? (inherited ? findRole(prior.join('\n')) : null)
  const champ = now ?? inherited
  if (now && BLURB[now]) return BLURB[now]
  if (/(elo|rang|ranked|lp|wyj[sś]ć)/.test(s)) return ELO
  if (/(farm|cs|minion)/.test(s)) return FARM
  if (/(ward|wizj|vision)/.test(s)) return WARD
  if (/(smok|dragon|baron|herald|obiekt)/.test(s) || /\bherold/.test(fold(q))) return OBJ
  if (/(run|rune)/.test(s)) {
    if (champ) return speak(champ, role)
    return RUNE
  }
  if (/(build|item|przedmiot)/.test(s) || inherited) {
    if (champ) return speak(champ, role)
    if (findRole(q)) return `Rola: ${findRole(q)}. Podaj jeszcze championa, a rozpiszę start, pierwszy back i core. Pełne buildy znajdziesz też w zakładce Poradniki.`
    return BUILD_ASK
  }
  if (/(gank|jungl|dżungl)/.test(s) || /\bdzungl/.test(fold(q))) return JUNGLE
  if (/\b(makro|macro)\b/.test(fold(q))) return MACRO
  if (champ) return speak(champ, findRole(q))
  const onlyRole = findRole(q)
  if (onlyRole) return `Rola: ${onlyRole}. Doprecyzuj championa albo sytuację (build, runy, matchup, makro), a dam konkretną radę.`
  return GENERIC
}
