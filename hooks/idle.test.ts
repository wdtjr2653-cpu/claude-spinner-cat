import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} }

// 세션을 열고 입력창 위 띠를 띄운다. draft() 가 입력창에 쓰여 있는 글
async function start($: Engine, on: On, draft: () => string) {
  const clock = mock.clock(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.read', () => ({ value: { text: draft(), cursor: draft().length } }))
  await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount({ plugin: 'spinner-cat', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  return { clock, drawn: async () => JSON.stringify(await band.drawn()) }
}

test('쉴 때: 하품하고 엎드려 멈췄다가, 5초마다 잔동작을 하고 다시 멈추고, 3분 뒤 잠들어서도 5초마다 잔동작', async ($, on) => {
  const { clock, drawn } = await start($, on, () => '')

  expect(await drawn()).toContain('-o-')  // 하품부터(3초)
  await clock.advance(4_000)
  const still = await drawn()
  expect(still).toContain('식빵 굽는 중')
  await clock.advance(3_000)
  expect(await drawn()).toBe(still)       // 잔동작 사이엔 그대로(그리는 게 없다)
  await clock.advance(2_000)              // 3초 + 5초 쉬고 첫 잔동작(꼬리 살랑, 2초) 중
  expect(await drawn()).not.toBe(still)
  await clock.advance(3_000)
  expect(await drawn()).toBe(still)       // 다시 멈춤
  await clock.advance(175_000)            // 3분 7초: 잠들기 동작(5.5초)이 끝나고 멈춘 잠
  const asleep = await drawn()
  expect(asleep).toContain('쿨쿨 자는 중')
  await clock.advance(5_000)              // 5초 쉬고 첫 잔동작(z 피어오름, 4초) 중
  expect(await drawn()).not.toBe(asleep)
  await clock.advance(4_000)
  expect(await drawn()).toBe(asleep)      // 다시 멈춤
})

test('입력창에 글이 있으면 움직이지 않고, 지우면 다시 움직인다(그림이 바뀔 때마다 입력 커서가 깜빡여서)', async ($, on) => {
  let draft = ''
  const { clock, drawn } = await start($, on, () => draft)
  await clock.advance(4_000)
  const still = await drawn()
  draft = '안녕'
  for (let s = 0; s < 30; s++) {         // 잔동작 차례가 여러 번 와도 그대로
    await clock.advance(1_000)
    expect(await drawn()).toBe(still)
  }
  draft = ''
  let moved = false
  for (let s = 0; s < 12 && !moved; s++) {
    await clock.advance(1_000)
    moved = (await drawn()) !== still
  }
  expect(moved).toBe(true)
})

test('잔동작 도중에 글을 쓰기 시작하면 바로 멈춘 그림으로 돌아간다', async ($, on) => {
  let draft = ''
  const { clock, drawn } = await start($, on, () => draft)
  await clock.advance(4_000)
  const still = await drawn()
  await clock.advance(5_000)              // 첫 잔동작(꼬리 살랑, 8~10초) 중
  expect(await drawn()).not.toBe(still)
  draft = 'ㅎ'
  await clock.advance(300)                // 다음 박자(0.25초) 안에
  expect(await drawn()).toBe(still)
})
