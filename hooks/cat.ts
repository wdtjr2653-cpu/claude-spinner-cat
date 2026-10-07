import type { Phase } from '../types'

export type Mode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'

const W = 10
// 상태별 두 동작. 생각: 물음표가 오르내림 / 보내기: 귀 쫑긋 / 도구: 양발로 타자 / 답: 펜 끄적
// 얼굴 ' ( o.o )' 의 가운데는 4번째 칸. 발 줄도 가운데가 4번째 칸에 오게 맞춘다
const POSES: Record<'thinking' | 'requesting' | 'tool' | 'responding', string[][]> = {
  thinking: [['  /\\_/\\ ?', ' ( o.o )', '  (   )'], ['  /\\_/\\', ' ( o.O ) ?', '  (   )']],
  requesting: [['  /\\_/\\', ' ( o.o )', '  (   )>'], ['  /|_/\\', ' ( o.o )', '  (   ) >']],
  tool: [['  /\\_/\\', ' ( o.o )', '_(v)_(_)_'], ['  /\\_/\\', ' ( o.o )', '_(_)_(v)_']],
  responding: [['  /\\_/\\', ' ( ^.^ )', '  (   )_/'], ['  /\\_/\\', ' ( ^.^ )', '  (   )_\\']],
}

const group = (m: Mode) => (m === 'tool-input' || m === 'tool-use' ? 'tool' : m)

// 박자 t 의 고양이 3줄(폭 10 고정). 타자는 0.25초, 나머지는 0.5초마다 동작을 바꾸고 가끔 눈을 깜빡인다
export function pose(mode: Mode, t: number): string[] {
  const g = group(mode)
  const frame = POSES[g][(g === 'tool' ? t : Math.floor(t / 2)) % 2]!
  const blink = t % 40 >= 38
  return frame.map(r => (blink ? r.replace(/o\.[oO]/, '-.-') : r).padEnd(W))
}

// ── 쉬는 동안(입력창 위 띠) ──
// 동작(clip)마다 그림을 0.25초씩 한 번 재생하고, 끝나면 그 상태의 멈춘 그림으로 돌아간다(register.tsx 의 play).
// 0번은 들어갈 때 한 번(식빵: 하품하고 엎드리기 / 잠: 꾸벅꾸벅하다 잠들기), 1번부터는 틈틈이 돌아가며 하는 잔동작
const W_IDLE = 11
const EARS = '  /\\_/\\' // 작업 중 고양이와 같은 귀(사용자 선택: 귀 사이 막대기 하나가 귀엽다)
const TWITCH = '  /|_/\\' // 왼쪽 귀 쫑긋
const SIT = '  (   )'
const LOAF = ' (_____)'
const OPEN = ' o.o ', SHUT = ' -.- ', HEAVY = ' =.= ', YAWN = ' -o- ', WIDE = ' >O< '
const LEFT = 'o.o  ', RIGHT = '  o.o'

type Frame = string[]
// face 는 괄호 안 5칸. z 는 얼굴 줄 오른쪽(z)에서 귀 줄 더 오른쪽(Z)으로 비스듬히 피어오르고, 귀에 붙지 않게 띄운다
const f = (ears: string, face: string, body: string, z = ''): Frame =>
  [ears + (z.includes('Z') ? '   Z' : ''), ` (${face})` + (z.includes('z') ? ' z' : ''), body]
const hold = (frame: Frame, n: number): Frame[] => Array.from({ length: n }, () => frame)

const STILL: Record<Phase, Frame> = { rest: f(EARS, OPEN, LOAF + '~'), sleep: f(EARS, SHUT, LOAF, 'zZ') }

const CLIPS: Record<Phase, Frame[][]> = {
  rest: [
    [ // 하품하고 엎드리기
      ...hold(f(EARS, YAWN, SIT), 2), ...hold(f(EARS, WIDE, SIT), 4), ...hold(f(EARS, YAWN, SIT), 2),
      ...hold(f(EARS, OPEN, SIT), 2), ...hold(f(EARS, OPEN, LOAF + '_'), 2),
    ],
    [ // 꼬리 살랑
      ...hold(f(EARS, OPEN, LOAF + '_'), 2), ...hold(f(EARS, OPEN, LOAF + '~'), 2),
      ...hold(f(EARS, OPEN, LOAF + '_'), 2), ...hold(f(EARS, OPEN, LOAF + '~'), 2),
    ],
    [ // 두리번
      ...hold(f(EARS, LEFT, LOAF + '~'), 4), f(EARS, OPEN, LOAF + '~'), ...hold(f(EARS, RIGHT, LOAF + '~'), 4),
    ],
    [ // 천천히 눈 깜빡
      f(EARS, HEAVY, LOAF + '~'), ...hold(f(EARS, SHUT, LOAF + '~'), 4), f(EARS, HEAVY, LOAF + '~'),
    ],
    [ // 귀 쫑긋
      f(TWITCH, OPEN, LOAF + '~'), f(EARS, OPEN, LOAF + '~'), f(TWITCH, OPEN, LOAF + '~'),
    ],
  ],
  sleep: [
    [ // 꾸벅꾸벅하다 잠들기
      ...hold(f(EARS, HEAVY, LOAF), 4), ...hold(f(EARS, OPEN, LOAF), 2), ...hold(f(EARS, HEAVY, LOAF), 4),
      ...hold(f(EARS, SHUT, LOAF), 4), ...hold(f(EARS, SHUT, LOAF, 'z'), 4), ...hold(f(EARS, SHUT, LOAF, 'Z'), 4),
    ],
    [ // z 가 하나씩 피어오른다
      ...hold(f(EARS, SHUT, LOAF, 'Z'), 3), ...hold(f(EARS, SHUT, LOAF), 2), ...hold(f(EARS, SHUT, LOAF, 'z'), 3),
      ...hold(f(EARS, SHUT, LOAF, 'Z'), 3), ...hold(f(EARS, SHUT, LOAF), 2), ...hold(f(EARS, SHUT, LOAF, 'z'), 3),
    ],
    [ // 코골이: 입을 벌렸다 다물었다
      ...hold(f(EARS, YAWN, LOAF, 'zZ'), 3), ...hold(f(EARS, SHUT, LOAF, 'zZ'), 3), ...hold(f(EARS, YAWN, LOAF, 'zZ'), 3),
    ],
    [ // 자다가 귀 쫑긋
      f(TWITCH, SHUT, LOAF, 'zZ'), f(EARS, SHUT, LOAF, 'zZ'), f(TWITCH, SHUT, LOAF, 'zZ'),
    ],
    [ // 자다가 꼬리 까딱
      ...hold(f(EARS, SHUT, LOAF + '~', 'zZ'), 2), f(EARS, SHUT, LOAF, 'zZ'), ...hold(f(EARS, SHUT, LOAF + '~', 'zZ'), 2),
    ],
  ],
}

export const clipLength = (phase: Phase, clip: number) => CLIPS[phase][clip]!.length
// 0번(들어가기) 다음은 1번, 그 뒤로는 잔동작을 차례로 돌아가며
export const nextClip = (phase: Phase, clip: number) => (clip % (CLIPS[phase].length - 1)) + 1

// 동작 clip 의 step 번째 그림(3줄, 폭 12 고정). 동작이 끝났으면 멈춘 그림
export function idlePose(phase: Phase, clip: number, step: number): string[] {
  const frames = CLIPS[phase][clip]!
  return (step < frames.length ? frames[step]! : STILL[phase]).map(r => r.padEnd(W_IDLE))
}

export const idleLabel = (phase: Phase) => (phase === 'rest' ? '식빵 굽는 중' : '쿨쿨 자는 중')

// mcp__claude_ai_Gmail__search_threads -> search_threads
export const shortTool = (name: string) => name.split('__').pop() || name

export function label(mode: Mode, tool: string, message: string | null): string {
  if (message) return message // 압축 중 등 엔진이 덮어쓴 문구는 그대로
  const t = shortTool(tool) || '도구'
  return {
    requesting: '보내는 중',
    thinking: '흠… 생각 중',
    'tool-input': `${t} 준비 중`,
    'tool-use': `타닥타닥 ${t} 실행 중`,
    responding: '슥슥 답 쓰는 중',
  }[mode]
}

export function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return s < 60 ? `${s}초` : `${Math.floor(s / 60)}분 ${s % 60}초`
}
