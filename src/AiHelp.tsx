import { useEffect, useRef, useState } from 'react'
type Msg = { r: 'ai' | 'me'; t: string }
function Typed({ t, on }: { t: string; on: boolean }) {
  const [n, setN] = useState(on ? 0 : t.length)
  useEffect(() => { if (n >= t.length) return; const id = setTimeout(() => setN(n + 2), 14); return () => clearTimeout(id) }, [n, t])
  return <>{t.slice(0, n)}{n < t.length && <b className="aih-caret" />}</>
}
const LOL = /(lol|league|legend|champ|champion|postac|build|item|przedmiot|run[ay]|rune|lane|lini|top|jungl|dżungl|mid|adc|bot|support|supp|gank|smite|flash|ignite|ghost|barrier|teleport|tp|ult|skill|combo|matchup|counter|kontr|tier|meta|patch|ranked|rang|elo|lp|iron|bronze|silver|gold|plat|emerald|diament|master|challenger|baron|smok|dragon|herald|wieża|wiez|turret|nexus|minion|cs|farm|ward|wizj|vision|teamfight|split|roam|back|recall|zhonya|shojin|eclipse|trinity|draven|kassadin|twitch|graves|hecarim|ahri|yasuo|yone|lee|jinx|thresh|garen|darius|riven|zed|lux|ezreal|kaisa|vayne|teemo|rift|aram|arena|summoner)/i
function answer(q: string): string {
  const s = q.toLowerCase()
  if (!LOL.test(s)) return 'Odpowiadam tylko na pytania o League of Legends 🙂 Zapytaj np. o build, runy, matchup, makro albo jak wyjść z elo.'
  if (/hecarim/.test(s)) return 'Hecarim (jungle): Shojin → Death\'s Dance → Bezustanny Głód, buty Lucidity. Runy: Stormraider, Q>W>E. Szukaj ganków z Ghostem + E na flankę.'
  if (/draven/.test(s)) return 'Draven: łap topory w miejscu, gdzie i tak chcesz stać. Wczesny trade lv2–3, Bloodthirster/IE pierwszy, Flash+Barrier/Heal.'
  if (/kassadin/.test(s)) return 'Kassadin: przetrwaj do 6 i 11 lvl, farm spokojnie, Rod of Ages → Lich Bane. Siła rośnie z czasem gry — nie forsuj early.'
  if (/twitch/.test(s)) return 'Twitch: wykorzystuj Q do roamów i flankowania w teamfightach, Ult z bezpiecznej pozycji za frontem.'
  if (/graves/.test(s)) return 'Graves: szybki full clear, tempo gank albo invade. Lethality (Collector/Youmuu) dla jungle, pilnuj ammo i E na resety.'
  if (/(elo|rang|ranked|lp|wyj[sś]ć)/.test(s)) return 'Na wyjście z elo: 1–2 role, 2–3 championów, CS 7+/min, ward na rzece przed 3:00, gramy wokół obiektów i mutujemy toksyczny chat.'
  if (/(farm|cs|minion)/.test(s)) return 'Farm: celuj w 80 CS na 10 min. Ćwicz last hit w Practice Tool, pod wieżą: melee 2 strzały wieży + hit, caster hit + wieża + hit.'
  if (/(ward|wizj|vision)/.test(s)) return 'Wizja: kup Control Ward przy każdym backu, wardy na rzece/tribush przed obiektami, zmień trinket na Oracle jako support/jungler.'
  if (/(smok|dragon|baron|herald|obiekt)/.test(s)) return 'Obiekty: zbieraj prio na botlane/midzie 45–60 s przed spawnem, ustaw wizję i dopiero wtedy start. Baron po wygranym teamfighcie lub pick.'
  if (/(run|rune)/.test(s)) return 'Runy dobieraj do roli: Conqueror dla bruiserów, Electrocute dla burst, Lethal Tempo/PTA dla ADC, Aery/Guardian dla supportów. Podaj championa, dam konkret.'
  if (/(build|item|przedmiot)/.test(s)) return 'Podaj championa i rolę, a rozpiszę start, pierwszy back i core. Pełne buildy znajdziesz też w zakładce Poradniki.'
  if (/(gank|jungl|dżungl)/.test(s)) return 'Jungla: gankuj linie z prio i slowami/CC, unikaj linii bez wizji. Śledź enemy junglera z pierwszego clearu i rób kontr-ganki.'
  return 'Dobre pytanie z LoLa! Doprecyzuj championa, rolę albo sytuację (lane/makro/teamfight), a dam konkretną radę.'
}
const SUG = ['🏆 Jak wyjść z Silvera?', '🐎 Build na Hecarima?', '🐉 Kiedy brać smoka?', '🌾 Jak lepiej farmić?', '🪓 Jak grać Dravenem?', '👁️ Jak wardować?']
export default function AiHelp() {
  const [m, setM] = useState<Msg[]>([{ r: 'ai', t: 'Cześć! Jestem AI Rifted — pytaj o wszystko z League of Legends: buildy, runy, matchupy, makro.' }])
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { const l = end.current?.parentElement; l?.scrollTo({ top: l.scrollHeight, behavior: 'smooth' }) }, [m, busy])
  const send = (t = q) => { const v = t.trim(); if (!v || busy) return; setM(x => [...x, { r: 'me', t: v }]); setQ(''); setBusy(true)
    setTimeout(() => { setM(x => [...x, { r: 'ai', t: answer(v) }]); setBusy(false) }, 650) }
  return (
    <div className="glass aih"><div className="aih-orb o1"/><div className="aih-orb o2"/>
      <div className="aih-h"><div className="aih-ico">✦</div><div><h2>AI pomoc</h2><span><i className="aih-live"/>Online · tylko League of Legends</span></div><div className="aih-badge">🛡️ Filtr LoL</div></div>
      <div className="aih-log">
        {m.map((x, i) => <div key={i} className={'aih-row ' + x.r}>{x.r === 'ai' && <div className="aih-av">✦</div>}<div className={'aih-m ' + x.r}>{x.r === 'ai' ? <Typed t={x.t} on={i > 0} /> : x.t}</div></div>)}
        {busy && <div className="aih-row ai"><div className="aih-av spin">✦</div><div className="aih-m ai typing"><i/><i/><i/></div></div>}
        <div ref={end} />
      </div>
      {<div className="aih-sug">{SUG.filter(x => !m.some(y => y.t === x)).slice(0, 4).map((s, i) => <button key={s} className="pill" style={{ animationDelay: i * 70 + 'ms' }} onClick={() => send(s)}>{s}</button>)}</div>}
      <form className="aih-f" onSubmit={e => { e.preventDefault(); send() }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Zapytaj o LoL… np. „jak grać vs Darius?”" maxLength={300} />
        <button className="pill cta" type="submit" disabled={busy || !q.trim()}>Wyślij</button>
      </form>
    </div>
  )
}
