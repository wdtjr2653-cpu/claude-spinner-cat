import { expect, mock, test } from 'claude-code/testing'

const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} }

test('쉴 때: 하품하고 엎드려 멈췄다가, 5초마다 잔동작을 하고 다시 멈추고, 3분 뒤 잠들어서도 5초마다 잔동작', async ($, on) => {
  const clock = mock.clock(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
  const band = await $.ui.mount({ plugin: 'spinner-cat', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  const drawn = async () => JSON.stringify(await band.drawn())

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
