import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { checkAuditReport } from './check-audit-report.mjs'

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const cases = readJson('./fixtures/style-overrides/cases.json')
const expectations = readJson('./style-overrides.expectations.json')
const reportFor = () => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete',
  scope: { comparisons: [{ id: 'pages', target: '/search', reference: '/settings' }] },
  findings: cases.map((item) => ({
    id: item.id, axis: item.axis, kind: 'static', status: [expectations[item.id]].flat()[0],
    comparisonId: item.axis === 'page-consistency' ? 'pages' : undefined,
    criterion: { path: 'DESIGN.md', section: item.section },
    subject: { path: item.path, role: item.subject }, expected: '가상 기준', observed: '가상 관찰',
    evidence: [{ kind: 'code', source: item.path }], limitations: ['검증기 단위 테스트이며 실제 소스 분석이 아닙니다.'],
  })),
})

test('스타일 덮어쓰기의 8개 계획을 별도 기대 판정과 대조한다', () => {
  assert.equal(cases.length, 8)
  assert.deepEqual(cases.map(({ id }) => id).sort(), Object.keys(expectations).sort())
  for (const item of cases)
    assert.ok(existsSync(new URL(`./fixtures/style-overrides/${item.path}`, import.meta.url)))
  const result = checkAuditReport(reportFor(), 'style-overrides')
  assert.equal(result.status, 'matched')
  assert.equal(result.summary.componentUsage.mismatched, 4)
  assert.equal(result.summary.pageConsistency.matchRate, 50)
})

test('고정 계약의 누락과 허용된 너비·plain의 오탐을 거부한다', () => {
  for (const id of ['CU-STYLE-01', 'CU-STYLE-02', 'CU-STYLE-03', 'CU-STYLE-06', 'PC-STYLE-01']) {
    const report = reportFor()
    report.findings.find((finding) => finding.id === id).status = 'match'
    assert.equal(checkAuditReport(report, 'style-overrides').status, 'mismatch', id)
  }
  for (const id of ['CU-STYLE-04', 'CU-STYLE-05']) {
    const report = reportFor()
    report.findings.find((finding) => finding.id === id).status = 'mismatch'
    assert.equal(checkAuditReport(report, 'style-overrides').status, 'mismatch', id)
  }
})

test('plain의 근거 있는 예외와 소스 근거 없는 판정을 구분한다', () => {
  const report = reportFor()
  report.findings.find(({ id }) => id === 'CU-STYLE-05').status = 'not-applicable'
  assert.equal(checkAuditReport(report, 'style-overrides').status, 'matched')
  report.findings[0].evidence = [{ kind: 'screenshot', source: '가상 캡처' }]
  assert.equal(checkAuditReport(report, 'style-overrides').status, 'mismatch')
})
