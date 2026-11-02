export const ONLINE: Record<string, boolean> = { Ty: true, VoidWalker: true, AxeCatcher: true, Ratatata: false, GallopKing: false, ArmUp: true, NotMain: false }
export const isOnline = (n: string) => ONLINE[n] ?? false
const CHAMP: Record<string, string> = { Ty: 'Ahri', VoidWalker: 'Kassadin', AxeCatcher: 'Draven', Ratatata: 'Twitch', GallopKing: 'Hecarim', ArmUp: 'Darius', NotMain: 'Thresh' }
export const avatar = (n: string) => `https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/${CHAMP[n] ?? 'Teemo'}.png`
