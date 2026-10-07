// 이번 턴: 시작 시각과 지금 돌고 있는 도구 이름
export type Turn = { startedAt: number | null; tool: string }
// 쉬는 동안: 식빵 굽기(rest) → 3분 뒤 잠(sleep). clip 은 지금 하는 동작(0 = 들어가기, 1~ = 잔동작), step 은 그 동작의 몇 번째 그림인지
export type Phase = 'rest' | 'sleep'
export type Idle = { phase: Phase; clip: number; step: number }

declare module 'claude-code' {
  interface PluginState {
    // tick: 작업 중 0.25초마다 1씩 오르는 애니메이션 박자 / working: 턴이 도는 중인지(작업 도중 다시 읽었을 때 박자를 이어 가려고)
    'spinner-cat': { tick: number; turn: Turn; idle: Idle; working: boolean }
  }
}
