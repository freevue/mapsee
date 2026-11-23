import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { checkAuditReport } from './check-audit-report.mjs'

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const cases = readJson('./fixtures/semantic-contracts/cases.json')
const expectations = readJson('./semantic-contracts.expectations.json')
const reportFor = () => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete',
  findings: cases.map((item) => ({
    id: item.id, axis: item.axis, kind: item.method === 'static' ? 'static' : 'measurement',
    status: expectations[item.id], criterion: { path: 'DESIGN.md', section: item.section },
    subject: { path: item.path }, expected: '가상 기준', observed: '가상 관찰',
    evidence: [{ kind: item.evidenceKinds[0], source: item.path }],
    limitations: ['보고서 검증기의 회귀이며 실제 분석·브라우저 실행은 별도입니다.'],
  })),
})

test('의미 계약 10개 계획과 별도 기대 판정·원본 경로를 연결한다', () => {
  assert.equal(cases.length, 10)
  assert.deepEqual(cases.map(({ id }) => id).sort(), Object.keys(expectations).sort())
  for (const item of cases) assert.ok(existsSync(new URL(`./fixtures/semantic-contracts/${item.path}`, import.meta.url)))
  const result = checkAuditReport(reportFor(), 'semantic-contracts')
  assert.equal(result.status, 'matched')
  assert.equal(result.summary.componentUsage.mismatched, 4)
  assert.equal(result.summary.componentUsage.review, 1)
})

test('같은 색의 역할 오용·오타·상태 불일치·포커스 소실을 정상으로 넘기지 않는다', () => {
  for (const identifier of ['CU-MEANING-02', 'CU-MEANING-04', 'CU-STATE-02', 'CU-FORCED-02']) {
    const report = reportFor()
    report.findings.find(({ id }) => id === identifier).status = 'match'
    assert.equal(checkAuditReport(report, 'semantic-contracts').status, 'mismatch')
  }
})

test('별칭·허용 fallback·수동 탭·outline의 오탐과 미정 기준의 승격을 거부한다', () => {
  for (const identifier of ['CU-MEANING-03', 'CU-MEANING-05', 'CU-STATE-01', 'CU-FORCED-01', 'CU-MEANING-06']) {
    const report = reportFor()
    report.findings.find(({ id }) => id === identifier).status = 'mismatch'
    assert.equal(checkAuditReport(report, 'semantic-contracts').status, 'mismatch')
  }
})

test('화면·조작을 정적 선언으로 대체하지 않고 재현 불가를 미측정으로 남긴다', () => {
  const report = reportFor()
  const finding = report.findings.find(({ id }) => id === 'CU-FORCED-02')
  finding.kind = 'static'
  assert.equal(checkAuditReport(report, 'semantic-contracts').status, 'mismatch')
  finding.kind = 'measurement'; finding.status = 'not-measured'; finding.observed = null
  report.runStatus = 'incomplete'
  const result = checkAuditReport(report, 'semantic-contracts')
  assert.equal(result.status, 'pending')
  assert.deepEqual(result.pending, ['CU-FORCED-02'])
})
