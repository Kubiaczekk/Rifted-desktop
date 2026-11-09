import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answer, championMention } from '../src/lolScope.ts'

const BUILD_ASK = 'Podaj championa i rolę, a rozpiszę start, pierwszy back i core. Pełne buildy znajdziesz też w zakładce Poradniki.'

function rejects(q: string, ctx?: { priorUser?: string[]; lastAi?: string }, label = q) {
  const a = answer(q, ctx)
  assert.ok(a.startsWith('Odpowiadam tylko'), `${label} → ${a}`)
}
function allows(q: string, ctx?: { priorUser?: string[]; lastAi?: string }) {
  const a = answer(q, ctx)
  assert.ok(!a.startsWith('Odpowiadam tylko'), `${q} → ${a}`)
  return a
}

test('katarine build is answered, not rejected or asked again', () => {
  const a = allows('jaki build na katarine')
  assert.match(a, /Katarina/)
  assert.match(a, /Poradniki/)
  assert.match(a, /Przepływ Burzy/)
  assert.doesNotMatch(a, /Podaj championa/)
})

test('screenshot follow-up: bare katarina stays in the LoL thread', () => {
  const first = answer('jaki build na katarine')
  const second = allows('katarina', { priorUser: ['jaki build na katarine'], lastAi: first })
  assert.match(second, /Katarina/)
  assert.match(second, /Poradniki/)
})

test('bare katarina after the old build prompt is the Katarina build', () => {
  const a = allows('katarina', { priorUser: ['jaki build'], lastAi: BUILD_ASK })
  assert.match(a, /Katarina \(mid\)/)
  assert.match(a, /Poradniki/)
})

test('katarina typos, declension and the short name', () => {
  for (const q of ['katarina', 'Katarinę', 'katarinie', 'katariny', 'katarino', 'kata', 'catarina', 'jaki build na katarinie']) {
    const a = allows(q)
    assert.match(a, /Katarina/, q)
  }
  assert.equal(championMention('jaki build na katarine'), 'Katarina')
  assert.equal(championMention('Build na Hecarima?'), 'Hecarim')
})

test('suggestion chips stay on LoL topics', () => {
  const chips: [string, RegExp][] = [
    ['🏆 Jak wyjść z Silvera?', /elo/i],
    ['🐎 Build na Hecarima?', /Shojin/],
    ['🐉 Kiedy brać smoka?', /Obiekty/],
    ['🌾 Jak lepiej farmić?', /^Farm/],
    ['🪓 Jak grać Dravenem?', /topory/],
    ['👁️ Jak wardować?', /Wizja/],
  ]
  for (const [q, re] of chips) assert.match(allows(q), re, q)
})

test('role follow-ups and thread context', () => {
  assert.match(allows('wsparcie'), /support/)
  assert.match(allows('mid'), /mid/)
  assert.match(allows('jg'), /jungle/)
  assert.match(allows('dżungla'), /Jungla|jungle/)
  const mid = allows('mid', { priorUser: ['jaki build na katarine'], lastAi: BUILD_ASK })
  assert.match(mid, /Katarina/)
  const again = allows('a jaki ma build?', { priorUser: ['opowiedz o katarinie'], lastAi: 'Dobre pytanie z LoLa!' })
  assert.match(again, /Katarina/)
  assert.match(allows('ta sama', { priorUser: ['katarina'], lastAi: 'Katarina (mid): core.' }), /Katarina/)
  rejects('ta sama')
})

test('a later elo question does not stay stuck on Katarina', () => {
  const a = allows('jak wyjść z silvera', { priorUser: ['katarina'], lastAi: 'Katarina (mid): core.' })
  assert.match(a, /Na wyjście z elo/)
  assert.doesNotMatch(a, /Przepływ Burzy/)
})

test('other champions and build prompts', () => {
  assert.match(allows('jaki build na ahri'), /Ahri/)
  assert.match(allows('jaki build na ahri'), /Poradniki/)
  assert.doesNotMatch(allows('jaki build na ahri'), /Podaj championa/)
  assert.match(allows('jaki build'), /Podaj championa i rolę/)
  assert.match(allows('jaki build na mid'), /Rola: mid/)
  assert.match(allows('lee sin'), /Lee Sin/)
  assert.match(allows("kai'sa"), /Kai'Sa/)
  assert.match(allows('wukong'), /Wukong/)
  assert.match(allows('zaahen'), /Zaahen/)
  assert.match(allows('jakie makro na midzie'), /Makro/)
  assert.match(allows('hecarim'), /Shojin/)
})

test('short or ambiguous names need a LoL context', () => {
  assert.match(allows('nami'), /Nami/)
  assert.match(allows('gram nami'), /Nami/)
  assert.match(allows('nami vs lux'), /Nami|Lux/)
  rejects('idz z nami')
  rejects('idź z nami')
  rejects('gra z nami')
  rejects('mam talon')
  assert.match(allows('talon'), /Talon/)
  assert.match(allows('jaki build na talona'), /Talon/)
  rejects('mydlo lux')
  assert.match(allows('lux'), /Lux/)
  assert.match(allows('co to yi'), /Master Yi/)
  rejects('moj kolega ali')
  assert.match(allows('ali'), /Alistar/)
})

test('off-topic stays blocked, including inside a LoL thread', () => {
  for (const q of [
    'jaka jest pogoda', 'przepis na pizze', 'napisz kod w pythonie', 'opowiedz dowcip',
    'jaki film dzisiaj', 'matematyka z szkoly', 'bitcoin', 'metal', 'laptop', 'farmacja',
    'platforma', 'kontrakt', 'ultra', 'wiezienie', 'kultura', 'rankiem wyszedlem',
    'zelazko', 'srebrny samochod', 'mastercard', 'botanika', 'champagne', 'supper',
    'linijka', 'orange', 'ironiczny komentarz', 'background', 'help me', 'melodia', 'melon',
  ]) rejects(q)
  rejects('przepis na pizze', { priorUser: ['jaki build na katarine'], lastAi: 'Katarina (mid): core.' })
  rejects('pogoda jutro', { priorUser: ['katarina'], lastAi: 'Katarina (mid): core.' })
})
