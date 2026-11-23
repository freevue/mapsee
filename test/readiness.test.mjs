import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkReadiness } from '../plugins/mapsee/skills/lint/scripts/readiness.mjs'

const fixtureFor = () => {
  const context = { url: '/', selector: '#form', state: 'players', viewport: { width: 390, height: 844 } }
  const expected = { context, observationMs: 200, maxSampleGapMs: 120, geometryTolerance: 0.5,
    opacities: { '#form': 1, '#screen': 1 }, assets: [{ id: 'font', status: 'loaded' }, { id: 'logo', status: 'loaded' }] }
  return { version: 1, mode: 'settled', expected, samples: [0, 100, 210].map((timeMs) => ({
    timeMs, context: structuredClone(context), found: true, rect: { x: 16, y: 100, width: 358, height: 500 },
    opacities: { ...expected.opacities }, animations: 0, assets: structuredClone(expected.assets),
  })) }
}

test('준비 검사는 선택한 연속 구간·조건을 확인하고 입력을 보존한다', () => {
  const input = fixtureFor(); const before = JSON.stringify(input)
  assert.equal(checkReadiness(input).status, 'ready')
  assert.equal(JSON.stringify(input), before)
})

test('조상의 페이드·실제 이동·자산 대기·실패를 완료 근거로 만들지 않는다', () => {
  for (const mutate of [
    (input) => { input.samples[0].opacities['#screen'] = 0.3 },
    (input) => { input.samples[1].rect.y = 140 },
    (input) => { input.samples[1].animations = 1 },
    (input) => { input.samples[1].assets[0].status = 'pending' },
    (input) => { input.samples[2].assets[1].status = 'failed' },
    (input) => { input.samples[1].assets = [] },
    (input) => { input.samples[2].context.state = 'loading' },
    (input) => { input.samples[2].found = false; input.samples[2].rect = null },
  ]) {
    const input = fixtureFor(); mutate(input)
    assert.equal(checkReadiness(input).status, 'pending')
  }
})

test('불투명도 50%의 의도된 상태와 실패 자산 대체 화면도 명시한 조건으로 검사한다', () => {
  const input = fixtureFor()
  input.expected.opacities['#form'] = 0.5
  input.expected.assets[1].status = 'failed'
  for (const sample of input.samples) {
    sample.opacities['#form'] = 0.5; sample.assets[1].status = 'failed'
  }
  assert.equal(checkReadiness(input).status, 'ready')
})

test('단일·빈 관찰·짧은 구간은 ready가 아니며 전환 자체 검사를 정지 화면으로 승격하지 않는다', () => {
  const input = fixtureFor()
  for (const samples of [[], input.samples.slice(0, 1), input.samples.slice(0, 2)])
    assert.equal(checkReadiness({ ...input, samples }).status, 'pending')
  assert.equal(checkReadiness({ ...input, mode: 'transition' }).status, 'transition')
})

test('잘못된 시각·경계·자산·기대값은 입력 오류다', () => {
  for (const mutate of [
    (input) => { input.version = 2 }, (input) => { input.expected.observationMs = 0 },
    (input) => { input.expected.geometryTolerance = -1 }, (input) => { input.expected.opacities = {} },
    (input) => { input.samples[1].timeMs = 0 }, (input) => { input.samples[0].rect.x = NaN },
    (input) => { input.samples[0].animations = -1 },
    (input) => { input.expected.assets.push({ id: 'font', status: 'loaded' }) },
  ]) {
    const input = fixtureFor(); mutate(input)
    assert.throws(() => checkReadiness(input))
  }
})

test('시작과 종료 사이가 길어도 관찰 공백이 큰 두 장을 연속 확인으로 인정하지 않는다', () => {
  const input = fixtureFor()
  input.samples = [input.samples[0], { ...input.samples[2], timeMs: 1000 }]
  assert.equal(checkReadiness(input).status, 'pending')
  assert.match(checkReadiness(input).reasons.join(' '), /간격/)
})
