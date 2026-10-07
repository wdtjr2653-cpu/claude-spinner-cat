import { expect, test } from 'claude-code/testing'

import type { Mode } from './cat'
import { clipLength, elapsed, idleLabel, idlePose, label, nextClip, pose, shortTool } from './cat'

const MODES: Mode[] = ['requesting', 'thinking', 'tool-input', 'tool-use', 'responding']

// 줄의 글자(공백·물음표 제외) 가운데 칸
const center = (line: string) => {
  const idx = [...line].flatMap((c, i) => (c !== ' ' && c !== '?' ? [i] : []))
  return (idx[0]! + idx[idx.length - 1]!) / 2
}

test('모든 상태·박자에서 3줄, 폭 10으로 고정(흔들리지 않게)', () => {
  for (const m of MODES) {
    for (let t = 0; t < 80; t++) {
      const p = pose(m, t)
      expect(p.length).toBe(3)
      for (const line of p) expect(line.length).toBe(10)
    }
  }
})

test('몸·발 줄의 가운데가 얼굴 가운데와 같다(타자 칠 때 팔이 밀리지 않게)', () => {
  for (const m of MODES) {
    for (let t = 0; t < 4; t++) {
      const [, face, body] = pose(m, t)
      const off = center(body!) - center(face!)
      expect(Math.abs(off)).toBeLessThanOrEqual(m === 'requesting' || m === 'responding' ? 1.5 : 0) // 종이비행기·펜은 오른쪽으로 삐져나와도 된다
    }
  }
})

test('상태마다 동작이 다르고, 박자에 따라 바뀐다', () => {
  expect(pose('tool-use', 0)[2]).toContain('(v)_(_)')
  expect(pose('tool-use', 1)[2]).toContain('(_)_(v)')   // 타자는 0.25초마다
  expect(pose('thinking', 0)[0]).toContain('?')
  expect(pose('thinking', 2)[1]).toContain('?')          // 물음표가 내려온다
  expect(pose('responding', 0)[1]).toContain('^.^')
  expect(pose('thinking', 38)[1]).toContain('-.-')       // 깜빡임
})

test('문구: 도구 이름 줄이기, 엔진이 덮어쓴 문구 우선', () => {
  expect(shortTool('mcp__claude_ai_Gmail__search_threads')).toBe('search_threads')
  expect(label('tool-use', 'Bash', null)).toBe('타닥타닥 Bash 실행 중')
  expect(label('tool-input', '', null)).toBe('도구 준비 중')
  expect(label('thinking', 'Bash', 'Compacting conversation')).toBe('Compacting conversation')
  expect([elapsed(9_000), elapsed(65_000)]).toEqual(['9초', '1분 5초'])
})

test('쉬는 그림: 3줄·폭 11, 귀는 얼굴 가운데, z 는 귀에서 떨어지고, 동작이 끝나면 같은 멈춘 그림', () => {
  for (const ph of ['rest', 'sleep'] as const) {
    const clips = [0] // 들어가기 다음부터 잔동작을 한 바퀴 돈다
    for (let c = nextClip(ph, 0); !clips.includes(c); c = nextClip(ph, c)) clips.push(c)
    expect(clips.length).toBeGreaterThan(3)
    for (const c of clips) {
      for (let s = 0; s <= clipLength(ph, c); s++) {
        const [ears, face, body] = idlePose(ph, c, s) as [string, string, string]
        for (const line of [ears, face, body]) expect(line.length).toBe(11)
        expect(ears.indexOf('/')).toBe(face.indexOf('(') + 1)          // 귀는 얼굴 양끝에서 한 칸씩 안쪽
        expect(ears.lastIndexOf('\\')).toBe(face.lastIndexOf(')') - 1)
        if (ears.includes('Z')) expect(ears.indexOf('Z') - ears.lastIndexOf('\\')).toBeGreaterThan(2)
        expect(body.indexOf('(')).toBeGreaterThanOrEqual(face.indexOf('('))
      }
      expect(idlePose(ph, c, clipLength(ph, c))).toEqual(idlePose(ph, 0, 999)) // 끝나면 멈춘 그림
    }
  }
  expect(idlePose('rest', 0, 0)[1]).toContain('-o-')         // 하품으로 시작
  expect(idlePose('rest', 0, 999)[2]).toContain('(_____)~')  // 식빵 자세로 멈춤
  expect(idlePose('sleep', 0, 999).join('|')).toMatch(/-\.-.*z/)
  expect([idleLabel('rest'), idleLabel('sleep')]).toEqual(['식빵 굽는 중', '쿨쿨 자는 중'])
})
