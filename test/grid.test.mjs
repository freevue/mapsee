import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectGrid } from '../plugins/mapsee/skills/lint/scripts/grid-input.mjs'
import { renderGridSvg } from '../plugins/mapsee/skills/lint/scripts/grid-svg.mjs'
import { gridRecord } from './grid-support.mjs'

test('화면의 소수 좌표와 별개로 컨테이너 원점·간격·정렬을 계산하고 입력을 보존한다', () => {
  const input = gridRecord()
  delete input.grid.step
  const before = structuredClone(input)
  const result = inspectGrid(input)
  assert.equal(result.grid.step, 4)
  assert.deepEqual(result.checks.map(({ actual, status }) => [actual, status]), [[12, 'match'], [0, 'match'], [0, 'match']])
  assert.deepEqual(input, before)
})

test('간격 배수와 정렬 위반·소수 오차·음수 간격을 구분한다', () => {
  const input = gridRecord()
  input.elements[1].rect.y += 2
  input.elements[1].rect.x += 0.2
  let result = inspectGrid(input)
  assert.equal(result.checks[0].actual, 14)
  assert.equal(result.checks[0].deviation, 2)
  assert.equal(result.checks[0].status, 'mismatch')
  assert.equal(result.checks[1].status, 'match')
  input.elements[1].rect.x += 0.1
  result = inspectGrid(input)
  assert.equal(result.checks[1].status, 'mismatch')
  input.elements[1].rect.y = 26.5
  assert.equal(inspectGrid(input).checks[0].status, 'mismatch')
  assert.equal(inspectGrid(input).checks[0].expected, 0)
})

test('미채택 격자의 산술 일치·차이 모두 검토이며 오류로 승격하지 않는다', () => {
  const input = gridRecord()
  input.grid.adopted = false
  input.elements[1].rect.y += 2
  const checks = inspectGrid(input).checks
  assert.ok(checks.every(({ status }) => status === 'review'))
  assert.deepEqual(checks.map(({ withinTolerance }) => withinTolerance), [false, true, true])
})

test('잘못된 축·경계·요소 연결·중복·오차·캡처 밖 좌표를 거부한다', () => {
  const mutations = [
    (input) => { input.checks[0].axis = 'z' },
    (input) => { input.checks[0].to.edge = 'left' },
    (input) => { input.checks[0].to.element = 'missing' },
    (input) => { input.checks.push(input.checks[0]) },
    (input) => { input.elements.push(input.elements[0]) },
    (input) => { input.elements[0].rect.x = -1 },
    (input) => { input.grid.tolerance = 2 },
    (input) => { input.grid.step = 0 },
    (input) => { input.grid.origin.x = Infinity },
    (input) => { input.capture.clip.width = 129 },
    (input) => { input.grid.basis = '' },
    (input) => { delete input.context.state },
  ]
  for (const mutate of mutations) {
    const input = gridRecord()
    mutate(input)
    assert.throws(() => inspectGrid(input))
  }
})

test('SVG는 캡처의 CSS 오프셋·격자 원점·이미지를 보존하며 문구를 XML로 이스케이프한다', () => {
  const input = gridRecord()
  input.capture.clip = { x: 8, y: 8, width: 100, height: 100 }
  input.context.state = '<script>&"'
  const result = inspectGrid(input)
  const svg = renderGridSvg(input, result, Buffer.from('가상 PNG'))
  assert.ok(svg.includes('x="2.5" y="2.5" width="4"'))
  assert.ok(svg.includes('M42.5,22.5 L42.5,34.5'))
  assert.ok(svg.includes('data:image/png;base64,'))
  assert.ok(svg.includes('&lt;script&gt;&amp;&quot;'))
  assert.ok(!svg.includes('<script>'))
})
