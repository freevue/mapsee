import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { checkAuditReport } from './check-audit-report.mjs'

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const cases = readJson('./fixtures/component-contracts/cases.json')
const expectations = readJson('./component-contracts.expectations.json')
const reportFor = () => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete',
  scope: { comparisons: [] },
  inputs: { environment: '검증기 단위 테스트용 가상 입력입니다. 실제 소스 분석 결과가 아닙니다.' },
  findings: cases.map((check) => ({
    id: check.id, axis: check.axis, kind: check.method, status: expectations[check.id],
    criterion: { path: 'DESIGN.md', section: check.section },
    subject: { path: check.path, role: check.subject },
    expected: '가상 기준', observed: '가상 관찰',
    evidence: [{ kind: 'code', source: check.path, detail: '검증기 단위 테스트용 근거' }],
    limitations: ['실제 전달과 브라우저 동작은 이 테스트로 입증하지 않습니다.'],
  })),
})

test('분기·전달·복합 구성의 8개 계획과 별도 기대 판정이 대응한다', () => {
  assert.equal(cases.length, 8)
  assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length)
  assert.deepEqual(cases.map(({ id }) => id).sort(), Object.keys(expectations).sort())
  for (const check of cases)
    assert.ok(existsSync(new URL(`./fixtures/component-contracts/${check.path}`, import.meta.url)))
  const result = checkAuditReport(reportFor(), 'component-contracts')
  assert.equal(result.status, 'matched')
  assert.equal(result.summary.componentUsage.mismatched, 5)
  assert.equal(result.summary.componentUsage.matched, 3)
  assert.equal(result.summary.componentUsage.coverage, 100)
  assert.equal(result.summary.pageConsistency.matchRate, null)
})

test('기본 분기만 정상·속성 누락·연결 오류를 놓친 판정은 거부한다', () => {
  for (const id of ['CU-CON-01', 'CU-CON-02', 'CU-CON-03', 'CU-CON-05', 'CU-CON-06']) {
    const report = reportFor()
    report.findings.find((finding) => finding.id === id).status = 'match'
    assert.equal(checkAuditReport(report, 'component-contracts').status, 'mismatch', id)
  }
})

test('정상 전달·정상 조합·의도적인 비공개 속성을 오탐하면 거부한다', () => {
  for (const id of ['CU-CON-04', 'CU-CON-07', 'CU-CON-08']) {
    const report = reportFor()
    report.findings.find((finding) => finding.id === id).status = 'mismatch'
    assert.equal(checkAuditReport(report, 'component-contracts').status, 'mismatch', id)
  }
})

test('소스 근거 누락과 다른 시나리오 판정을 구분하고 미측정을 남긴다', () => {
  const report = reportFor()
  report.findings[0].evidence = [{ kind: 'screenshot', source: '가상 캡처' }]
  assert.equal(checkAuditReport(report, 'component-contracts').status, 'mismatch')
  assert.equal(checkAuditReport(reportFor(), 'component-reuse').status, 'mismatch')
  const pending = reportFor()
  pending.runStatus = 'incomplete'
  pending.findings[0].status = 'not-measured'
  const result = checkAuditReport(pending, 'component-contracts')
  assert.equal(result.status, 'pending')
  assert.equal(result.summary.componentUsage.coverage, 87.5)
})
