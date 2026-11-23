import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeReport } from '../plugins/mapsee/skills/lint/scripts/summary.mjs'

const context = { url: '/search', state: 'loading', selector: '#submit', viewport: { width: 390 } }
const reportFor = () => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'incomplete',
  scope: { bindingVersion: 1, inventory: [{
    id: 'loading', kind: 'state', path: '/search', role: '제출 대기',
    disposition: 'inspect', findingIds: ['button'], binding: structuredClone(context),
  }] },
  findings: [{
    id: 'button', axis: 'component-usage', kind: 'measurement', status: 'match',
    subject: { path: 'src/search.tsx', targetIds: ['loading'] },
    criterion: { path: 'DESIGN.md', section: '대기', digest: '기준-1' },
    expected: '잠금', observed: '잠금',
    evidence: [{ kind: 'dom', source: 'capture.json', captureId: 'capture-1', targetId: 'loading', basisDigest: '기준-1', context: structuredClone(context) }],
  }],
})

test('강화 연결은 실제 대상·상태·화면 조건과 기준 식별자를 대조한다', () => {
  const input = reportFor()
  input.runStatus = 'complete'
  const before = JSON.stringify(input)
  const result = summarizeReport(input)
  assert.equal(result.inventorySummary.checked, 1)
  assert.deepEqual(result.inventorySummary.bindingIssues, [])
  assert.equal(JSON.stringify(input), before)
})

test('다른 URL·상태·요소·화면·기준의 결과로 완료를 만들지 않는다', () => {
  const mutations = [
    (input) => { input.findings[0].evidence[0].context.url = '/settings' },
    (input) => { input.findings[0].evidence[0].context.state = 'default' },
    (input) => { input.findings[0].evidence[0].context.selector = '#cancel' },
    (input) => { input.findings[0].evidence[0].context.viewport.width = 1440 },
    (input) => { input.findings[0].evidence[0].basisDigest = '옛-기준' },
    (input) => { input.findings[0].subject.targetIds = ['other'] },
    (input) => { delete input.findings[0].evidence[0].captureId },
    (input) => { delete input.scope.inventory[0].binding },
  ]
  for (const mutate of mutations) {
    const input = reportFor();mutate(input)
    const result = summarizeReport(input)
    assert.equal(result.inventorySummary.checked, 0)
    assert.equal(result.inventorySummary.pending, 1)
    assert.equal(result.inventorySummary.bindingIssues.length, 1)
    input.runStatus = 'complete'
    assert.throws(() => summarizeReport(input), /미검사 대상/)
  }
})

test('이전 형식은 유지하되 강화 연결 검증으로 표시하지 않는다', () => {
  const input = reportFor()
  delete input.scope.bindingVersion
  delete input.scope.inventory[0].binding
  delete input.findings[0].subject.targetIds
  const result = summarizeReport(input)
  assert.equal(result.inventorySummary.checked, 1)
  assert.equal(result.inventorySummary.bindingIssues, undefined)
  input.scope.bindingVersion = 2
  assert.throws(() => summarizeReport(input), /연결 버전/)
})

test('같은 화면에서도 다른 부모 영역과 다른 연속 흐름의 근거를 구분한다', () => {
  const input = reportFor()
  const conditions = { container: { selector: '.panel', width: 360, contentWidth: 312 }, sequenceId: 'retry-success' }
  Object.assign(input.scope.inventory[0].binding, conditions)
  Object.assign(input.findings[0].evidence[0].context, structuredClone(conditions))
  assert.equal(summarizeReport(input).inventorySummary.checked, 1)
  input.findings[0].evidence[0].context.container.width = 800
  assert.equal(summarizeReport(input).inventorySummary.pending, 1)
  input.findings[0].evidence[0].context.container.width = 360
  input.findings[0].evidence[0].context.sequenceId = 'default-only'
  assert.equal(summarizeReport(input).inventorySummary.pending, 1)
})
