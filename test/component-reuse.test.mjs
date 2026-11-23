import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { checkAuditReport } from './check-audit-report.mjs'

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const cases = readJson('./fixtures/component-reuse/cases.json')
const expectations = readJson('./component-reuse.expectations.json')
const reportFor = () => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete',
  scope: { comparisons: [] },
  inputs: { environment: '검증기 단위 테스트용 가상 보고서이며 실제 에이전트의 판정이 아닙니다.' },
  findings: cases.map((check) => ({
    id: check.id, axis: check.axis, kind: check.method, status: [expectations[check.id]].flat()[0],
    criterion: { path: 'DESIGN.md', section: check.section },
    subject: { path: check.path, role: check.subject },
    expected: '가상 기준', observed: '가상 관찰',
    evidence: [{ kind: 'code', source: check.path, detail: '가상 검증기 입력' }],
    limitations: ['이 보고서로 실제 소스 분석이나 동작을 확인한 것은 아닙니다.'],
  })),
})

test('재사용 계획의 10개 대상과 기대 판정은 별도 파일에서 대응한다', () => {
  assert.equal(cases.length, 10)
  assert.deepEqual(cases.map(({ id }) => id).sort(), Object.keys(expectations).sort())
  assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length)
  for (const check of cases) {
    assert.equal(check.axis, 'component-usage')
    assert.ok(existsSync(new URL(`./fixtures/component-reuse/${check.path}`, import.meta.url)))
  }
})

test('재사용 시나리오의 위반·정상·구현 예외·미확정을 집계하고 입력을 보존한다', () => {
  const report = reportFor()
  const before = JSON.stringify(report)
  const result = checkAuditReport(report, 'component-reuse')
  assert.equal(result.status, 'matched')
  assert.equal(result.summary.componentUsage.matched, 4)
  assert.equal(result.summary.componentUsage.mismatched, 4)
  assert.equal(result.summary.componentUsage.review, 1)
  assert.equal(result.summary.componentUsage.notApplicable, 1)
  assert.equal(result.summary.componentUsage.coverage, 88.89)
  assert.equal(result.summary.pageConsistency.matchRate, null)
  assert.equal(JSON.stringify(report), before)
})

test('명시적으로 허용된 native 역할은 근거 있는 적용 제외로 보고해도 인정한다', () => {
  const report = reportFor()
  for (const id of ['CU-USE-06', 'CU-USE-08'])
    report.findings.find((finding) => finding.id === id).status = 'not-applicable'
  const result = checkAuditReport(report, 'component-reuse')
  assert.equal(result.status, 'matched')
  assert.equal(result.summary.componentUsage.notApplicable, 3)
})

test('일반 DOM 대체·이름만 모방한 구현·변형 오용을 정상 판정하면 거부한다', () => {
  for (const id of ['CU-USE-01', 'CU-USE-02', 'CU-USE-03', 'CU-USE-10']) {
    const report = reportFor()
    report.findings.find((finding) => finding.id === id).status = 'match'
    assert.equal(checkAuditReport(report, 'component-reuse').status, 'mismatch', id)
  }
})

test('별칭·래퍼·레이아웃·내부 DOM·대응 없는 역할을 위반으로 만들면 거부한다', () => {
  for (const id of ['CU-USE-04', 'CU-USE-05', 'CU-USE-06', 'CU-USE-07', 'CU-USE-08']) {
    const report = reportFor()
    report.findings.find((finding) => finding.id === id).status = 'mismatch'
    assert.equal(checkAuditReport(report, 'component-reuse').status, 'mismatch', id)
  }
})

test('미확정 기준의 확정 판정과 소스 없이 캡처만 있는 재사용 판정을 거부한다', () => {
  for (const status of ['match', 'mismatch']) {
    const report = reportFor()
    report.findings.find(({ id }) => id === 'CU-USE-09').status = status
    assert.equal(checkAuditReport(report, 'component-reuse').status, 'mismatch')
  }
  const report = reportFor()
  report.findings[0].evidence = [{ kind: 'screenshot', source: '가상 화면 캡처' }]
  assert.equal(checkAuditReport(report, 'component-reuse').status, 'mismatch')
})

test('선택한 재사용 시나리오의 미측정은 pending과 커버리지에 남긴다', () => {
  const report = reportFor()
  report.runStatus = 'incomplete'
  report.findings[0].status = 'not-measured'
  const result = checkAuditReport(report, 'component-reuse')
  assert.equal(result.status, 'pending')
  assert.deepEqual(result.pending, ['CU-USE-01'])
  assert.equal(result.summary.componentUsage.coverage, 77.78)
  assert.throws(() => checkAuditReport(report, 'unknown'), /검증 시나리오/)
})

test('CLI는 재사용 시나리오의 일치·오판·미측정·잘못된 선택을 구분한다', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mapsee-reuse-'))
  context.after(() => rmSync(directory, { recursive: true }))
  const cli = fileURLToPath(new URL('./check-audit-report.mjs', import.meta.url))
  for (const scenario of ['matched', 'mismatch', 'pending', 'unknown']) {
    const report = reportFor()
    if (scenario === 'mismatch') report.findings[0].status = 'match'
    if (scenario === 'pending') {
      report.runStatus = 'incomplete'
      report.findings[0].status = 'not-measured'
    }
    const path = join(directory, `${scenario}.json`)
    const input = JSON.stringify(report)
    writeFileSync(path, input)
    const suite = scenario === 'unknown' ? 'unknown' : 'component-reuse'
    const result = spawnSync(process.execPath, [cli, path, suite], { encoding: 'utf8' })
    assert.equal(result.status, { matched: 0, mismatch: 1, pending: 2, unknown: 1 }[scenario], result.stderr)
    if (scenario === 'unknown') assert.equal(result.stdout, '')
    else assert.equal(JSON.parse(result.stdout).status, scenario)
    assert.equal(readFileSync(path, 'utf8'), input)
  }
})
