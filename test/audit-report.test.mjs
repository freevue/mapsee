import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkAuditReport } from './check-audit-report.mjs'

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const cases = readJson('./fixtures/design-audit/cases.json')
const expectations = readJson('./design-audit.expectations.json')
const reportFor = (unmeasured = false) => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: unmeasured ? 'incomplete' : 'complete',
  scope: { comparisons: [{ id: 'views', target: 'index.html?view=target', reference: 'index.html?view=reference' }] },
  inputs: { environment: '결과 검사기의 단위 테스트용 가상 자료이며 실제 브라우저 결과가 아닙니다.' },
  findings: cases.map((check) => {
    const missing = unmeasured && check.method === 'browser'
    return {
      id: check.id, axis: check.axis, comparisonId: check.axis === 'page-consistency' ? 'views' : undefined,
      kind: check.method === 'browser' ? 'measurement' : check.method,
      status: missing ? 'not-measured' : [expectations[check.id]].flat()[0],
      criterion: { path: 'DESIGN.md', section: check.section },
      expected: '단위 테스트의 가상 기대값', observed: missing ? null : '단위 테스트의 가상 관찰값',
      evidence: missing ? [] : [{ kind: check.evidenceKinds[0], source: '가상 검사기 입력', detail: '실제 측정이 아님' }],
      limitations: ['이 보고서는 결과 검사기의 단위 테스트 입력입니다.'],
    }
  }),
})

test('검증 입력의 대상이 존재하고 계획·기대 판정 ID가 일치한다', () => {
  const html = readFileSync(new URL('./fixtures/design-audit/index.html', import.meta.url), 'utf8')
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length)
  assert.deepEqual(Object.keys(expectations).sort(), cases.map(({ id }) => id).sort())
  for (const check of cases) assert.ok(ids.includes(check.selector.slice(1)), check.id)
})

test('시나리오에 맞는 가상 보고서는 요약하되 입력을 보존한다', () => {
  const report = reportFor()
  const before = JSON.stringify(report)
  const result = checkAuditReport(report)
  assert.equal(result.status, 'matched')
  assert.equal(result.summary.componentUsage.review, 1)
  assert.equal(result.summary.pageConsistency.matchRate, 50)
  assert.equal(JSON.stringify(report), before)
})

test('화면을 재현하지 못한 보고서는 pending이며 커버리지에 남긴다', () => {
  const result = checkAuditReport(reportFor(true))
  assert.equal(result.status, 'pending')
  assert.equal(result.pending.length, 9)
  assert.equal(result.summary.componentUsage.notMeasured, 9)
  assert.ok(result.summary.componentUsage.coverage < 100)
})

test('명시적으로 허용된 pill을 중첩 규칙 적용 제외로 보고해도 오판으로 세지 않는다', () => {
  const report = reportFor()
  report.findings.find(({ id }) => id === 'CU-PILL').status = 'not-applicable'
  assert.equal(checkAuditReport(report).status, 'matched')
})

test('잘못된 선택 판정·계획 누락·불필요한 pill 위반·관계식 오판을 거부한다', () => {
  for (const id of ['CU-CHOICE', 'CU-PILL', 'PC-RADIUS']) {
    const report = reportFor()
    report.findings.find((finding) => finding.id === id).status = 'mismatch' === expectations[id] ? 'match' : 'mismatch'
    assert.equal(checkAuditReport(report).status, 'mismatch', id)
  }
  const report = reportFor()
  report.findings.pop()
  assert.equal(checkAuditReport(report).status, 'mismatch')
})

test('정적 선언과 스크린샷만으로 키보드 조작을 통과시키지 않는다', () => {
  for (const kind of ['code', 'screenshot']) {
    const report = reportFor()
    const focus = report.findings.find(({ id }) => id === 'CU-FOCUS')
    focus.kind = 'static'
    focus.evidence = [{ kind, source: '조작을 재현하지 않은 가상 근거' }]
    assert.equal(checkAuditReport(report).status, 'mismatch')
  }
})

test('검증 CLI는 잘못된 입력에서 성공을 출력하지 않는다', () => {
  const cli = fileURLToPath(new URL('./check-audit-report.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [cli], { encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.equal(result.stdout, '')
})

test('검증 CLI가 일치·미측정·오판의 종료 코드를 구분하고 입력을 보존한다', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mapsee-audit-'))
  context.after(() => rmSync(directory, { recursive: true }))
  const cli = fileURLToPath(new URL('./check-audit-report.mjs', import.meta.url))
  for (const status of ['matched', 'pending', 'mismatch']) {
    const report = reportFor(status === 'pending')
    if (status === 'mismatch') report.findings.find(({ id }) => id === 'CU-CHOICE').status = 'match'
    const path = join(directory, `${status}.json`)
    const input = JSON.stringify(report)
    writeFileSync(path, input)
    const result = spawnSync(process.execPath, [cli, path], { encoding: 'utf8' })
    assert.equal(result.status, { matched: 0, pending: 2, mismatch: 1 }[status], result.stderr)
    assert.equal(JSON.parse(result.stdout).status, status)
    assert.equal(readFileSync(path, 'utf8'), input)
  }
})
