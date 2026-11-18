import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeReport } from '../plugins/mapsee/skills/lint/scripts/summary.mjs'

const findingsFor = (axis, statuses) => statuses.map((status, index) => ({
  id: `${axis}-${index}`,
  axis,
  kind: 'static',
  comparisonId: axis === 'page-consistency' ? 'forms' : undefined,
  status,
  criterion: { path: 'DESIGN.md', section: '공통 버튼' },
  expected: 'primary',
  observed: status === 'not-measured' ? null : 'primary',
  evidence: [{ source: 'src/search.tsx:8' }],
  limitations: ['가상 자료: 역할별 예외 또는 화면 미접근'],
}))
const reportFor = (findings, runStatus = 'incomplete') => ({
  schemaVersion: 1,
  producer: 'mapsee',
  mode: 'report-only',
  runStatus,
  scope: { comparisons: [{ id: 'forms', target: 'src/search.tsx', reference: 'src/settings.tsx' }] },
  findings,
})

test('두 축을 분리하고 판단 필요·미측정·예외를 분모에 맞게 반영한다', () => {
  const statuses = [...Array(8).fill('match'), ...Array(2).fill('mismatch'), 'review', 'not-measured', 'not-measured', 'not-applicable']
  const report = reportFor([
    ...findingsFor('component-usage', statuses),
    ...findingsFor('page-consistency', ['match', 'mismatch']),
  ])
  const { summary } = summarizeReport(report)
  assert.deepEqual(summary.componentUsage, {
    total: 14, matched: 8, mismatched: 2, review: 1, notMeasured: 2,
    notApplicable: 1, evaluated: 10, eligible: 13, matchRate: 80, coverage: 76.92,
  })
  assert.equal(summary.pageConsistency.matchRate, 50)
  assert.equal(summary.pageConsistency.coverage, 100)
})

test('미측정·판단 필요만 있으면 일치율 null과 커버리지 0을 반환한다', () => {
  const report = reportFor(findingsFor('component-usage', ['review', 'not-measured']))
  assert.equal(summarizeReport(report).summary.componentUsage.matchRate, null)
  assert.equal(summarizeReport(report).summary.componentUsage.coverage, 0)
})

test('검사 없음·예외만 있는 축을 100%로 만들지 않는다', () => {
  for (const findings of [[], findingsFor('component-usage', ['not-applicable'])]) {
    const { summary } = summarizeReport(reportFor(findings, 'blocked'))
    assert.equal(summary.componentUsage.matchRate, null)
    assert.equal(summary.componentUsage.coverage, null)
    assert.equal(summary.pageConsistency.matchRate, null)
  }
})

test('기존 요약을 재계산하며 입력 보고서를 수정하지 않는다', () => {
  const report = { ...reportFor(findingsFor('component-usage', ['mismatch'])), summary: { matchRate: 100 } }
  const before = JSON.stringify(report)
  assert.equal(summarizeReport(report).summary.componentUsage.matchRate, 0)
  assert.equal(JSON.stringify(report), before)
})

test('0과 false를 유효한 관찰값으로 보존한다', () => {
  for (const value of [0, false]) {
    const [finding] = findingsFor('component-usage', ['match'])
    const report = reportFor([{ ...finding, expected: value, observed: value }])
    assert.equal(summarizeReport(report).summary.componentUsage.matchRate, 100)
  }
})

test('동일 ID 중복과 알려지지 않은 축·상태를 거부한다', () => {
  const [finding] = findingsFor('component-usage', ['match'])
  assert.throws(() => summarizeReport(reportFor([finding, finding])), /중복/)
  for (const altered of [{ ...finding, axis: 'beauty' }, { ...finding, status: 'pass' }, { ...finding, kind: 'unknown' }])
    assert.throws(() => summarizeReport(reportFor([altered])))
})

test('근거·기준·기대값 없는 확정 판정을 거부한다', () => {
  const [finding] = findingsFor('component-usage', ['mismatch'])
  for (const altered of [
    { ...finding, evidence: [] }, { ...finding, criterion: null },
    { ...finding, expected: null }, { ...finding, observed: null },
  ]) assert.throws(() => summarizeReport(reportFor([altered])))
})

test('비교 누락·같은 페이지 비교·중복 비교 ID를 거부한다', () => {
  const report = reportFor(findingsFor('page-consistency', ['match']))
  assert.throws(() => summarizeReport({ ...report, scope: { comparisons: [] } }))
  for (const comparisons of [
    [{ id: 'forms', target: 'same', reference: 'same' }],
    [{ id: 'forms', target: 'target', reference: null }],
    [...report.scope.comparisons, ...report.scope.comparisons],
  ]) assert.throws(() => summarizeReport({ ...report, scope: { comparisons } }))
})

test('미측정이 있는 complete와 근거 없는 예외 제외를 거부한다', () => {
  assert.throws(() => summarizeReport(reportFor(findingsFor('component-usage', ['not-measured']), 'complete')))
  const [finding] = findingsFor('component-usage', ['not-applicable'])
  assert.throws(() => summarizeReport(reportFor([{ ...finding, criterion: null }])))
  assert.throws(() => summarizeReport(reportFor([{ ...finding, limitations: [] }])))
})

test('다른 형식·생산자·모드의 입력을 거부한다', () => {
  const report = reportFor([])
  for (const altered of [null, { ...report, schemaVersion: 2 }, { ...report, producer: 'other' }, { ...report, mode: 'fix' }])
    assert.throws(() => summarizeReport(altered))
})
