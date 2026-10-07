import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Idle, Phase, Turn } from '../types'
import { clipLength, elapsed, idleLabel, idlePose, label, nextClip, pose } from './cat'

const TICK_MS = 250                // 작업 중·쉬는 동작 박자
const SLEEP_AFTER_MS = 3 * 60_000  // 입력 없이 이만큼 지나면 잠든다
// 잔동작 사이에 가만히 있는 시간. 그동안은 아무것도 다시 그리지 않는다:
// Orca 는 출력이 3초 멎어야 그 창을 조용하다고 본다(대기 판정·메시지 전달). 계속 움직이면 그게 깨지니 3초보다 길게
const GAP_MS: Record<Phase, number> = { rest: 5_000, sleep: 5_000 }
const tick = atom({ plugin: 'spinner-cat', key: 'tick' } as const, 0)
const turn = atom({ plugin: 'spinner-cat', key: 'turn' } as const, { startedAt: null, tool: '' } as Turn)
const idle = atom({ plugin: 'spinner-cat', key: 'idle' } as const, { phase: 'rest', clip: 0, step: 0 } as Idle)
const working = atom({ plugin: 'spinner-cat', key: 'working' } as const, false)

// work: 작업 중 박자 / beat: 쉬는 동작 박자 / next: 다음 잔동작 예약 / nap: 잠들기 예약
type Timers = { work?: Timer; beat?: Timer; next?: Timer; nap?: Timer }

function stopAll(timers: Timers) {
  for (const t of [timers.work, timers.beat, timers.next, timers.nap]) t?.cancel()
  timers.work = timers.beat = timers.next = timers.nap = undefined
}

function startWork($: EngineInterface, timers: Timers) {
  stopAll(timers)
  timers.work = $.clock.every(TICK_MS, () => void update($, tick, n => n + 1))
}

// 동작 하나를 한 번 재생하고 멈춘 그림으로 돌아간 뒤, 잠시 가만히 있다가 다음 잔동작을 한다
function play($: EngineInterface, timers: Timers, phase: Phase, clip: number) {
  timers.beat?.cancel()
  timers.next?.cancel()
  void update($, idle, () => ({ phase, clip, step: 0 }))
  const len = clipLength(phase, clip)
  const beat = $.clock.every(TICK_MS, () => {
    void update($, idle, r => ({ ...r, step: r.step + 1 })).then(r => {
      if (r.step < len || timers.beat !== beat) return
      beat.cancel()
      timers.beat = undefined
      timers.next = $.clock.after(GAP_MS[phase], () => play($, timers, phase, nextClip(phase, clip)))
    })
  })
  timers.beat = beat
}

// 턴이 끝났거나 세션이 막 열렸을 때: 식빵 굽기, 3분 뒤 잠
function goIdle($: EngineInterface, timers: Timers) {
  stopAll(timers)
  play($, timers, 'rest', 0)
  timers.nap = $.clock.after(SLEEP_AFTER_MS, () => play($, timers, 'sleep', 0))
}

export const register: Register = on => {
  const timers: Timers = {}

  // 세션이 열리면 쉬는 고양이로 시작. 작업 도중에 이 Mod 를 다시 읽었으면 작업 박자를 이어 간다
  on('session.start', async ($, e, next) => {
    if (e.isInteractive) {
      if (await read($, working)) startWork($, timers)
      else goIdle($, timers)
    }
    return next(e)
  })

  // 턴 동안만 작업 박자. 쉬는 동작·잔동작·잠들기 예약은 멈춘다
  on('turn.start', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, turn, () => ({ startedAt: now, tool: '' }))
    await update($, working, () => true)
    startWork($, timers)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) { // 서브에이전트가 끝난 건 본 턴의 끝이 아니다
      await update($, working, () => false)
      goIdle($, timers)
    }
    return next(e)
  })

  // 어떤 도구를 쓰는지 기억해 두었다가 '○○ 실행 중'에 쓴다. 실패해도 도구 호출은 그대로 통과
  on('tool.call', async ($, e, next) => {
    await update($, turn, t => ({ ...t, tool: e.tool }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)
    const t = await read($, tick)
    const { startedAt, tool } = await read($, turn)
    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)
    const { mode, message } = e.props

    return (
      <Box>
        <Box flexDirection="column">
          {pose(mode, t).map((line, i) => <Text key={`p${i}`} color="claude">{line}</Text>)}
        </Box>
        <Box flexDirection="column" justifyContent="center" marginLeft={1}>
          <Text wrap="truncate-end">
            <Text color="claude" bold>{label(mode, tool, message)}</Text>
            <Text dimColor>{startedAt === null ? '' : ` · ${elapsed(now - startedAt)}`} · esc 중단</Text>
          </Text>
        </Box>
      </Box>
    )
  })

  // 쉬는 동안 입력창 바로 위: 식빵 굽는 고양이, 3분 뒤 잠든 고양이(흐리게). 작업 중이거나 설문이 뜨면 비켜 준다
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isWorking || e.props.hasSurvey) return next(e)
    const { phase, clip, step } = await read($, idle)
    const asleep = phase === 'sleep'
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Box flexDirection="column">
          {idlePose(phase, clip, step).map((line, i) => <Text key={`r${i}`} color="claude" dimColor={asleep}>{line}</Text>)}
        </Box>
        <Box flexDirection="column" justifyContent="center" marginLeft={1}>
          <Text color="claude" dimColor={asleep} bold wrap="truncate-end">{idleLabel(phase)}</Text>
        </Box>
      </Box>
    )
  })
}
