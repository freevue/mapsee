import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { summarizeReport } from '../plugins/mapsee/skills/lint/scripts/summary.mjs'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const cases = readJson(new URL('./fixtures/design-audit/cases.json', import.meta.url))
const expectations = readJson(new URL('./design-audit.expectations.json', import.meta.url))

export const checkAuditReport = (input) => {
  const report = summarizeReport(input)
  const actual = new Map(report.findings.map((finding) => [finding.id, finding]))
  const expectedIds = new Set(cases.map(({ id }) => id))
  const issues = []
  const pending = []
  for (const check of cases) {
    const finding = actual.get(check.id)
    if (!finding) {
      issues.push(`${check.id}: 검사 항목이 없습니다.`)
      continue
    }
    if (finding.axis !== check.axis) issues.push(`${check.id}: 검사 축이 다릅니다.`)
    if (finding.status === 'not-measured') {
      pending.push(check.id)
      continue
    }
    if (![expectations[check.id]].flat().includes(finding.status)) issues.push(`${check.id}: 기대 판정과 다릅니다.`)
    if (check.method === 'browser' && finding.kind === 'static') issues.push(`${check.id}: 실제 화면·조작 근거가 필요합니다.`)
    const kinds = new Set((finding.evidence ?? []).map(({ kind }) => kind))
    if (!check.evidenceKinds.some((kind) => kinds.has(kind))) issues.push(`${check.id}: 필요한 종류의 근거가 없습니다.`)
  }
  for (const id of actual.keys()) {
    if (!expectedIds.has(id)) issues.push(`${id}: 계획에 없는 항목입니다.`)
  }
  return {
    status: issues.length ? 'mismatch' : pending.length ? 'pending' : 'matched',
    issues, pending, summary: report.summary,
    limitation: '보고서와 검증 시나리오의 일치 검사입니다. 근거의 진위와 실제 화면 수용은 별도 검토가 필요합니다.',
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('사용법: node test/check-audit-report.mjs <보고서.json>')
    const result = checkAuditReport(readJson(process.argv[2]))
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    process.exitCode = result.status === 'matched' ? 0 : result.status === 'pending' ? 2 : 1
  } catch (error) {
    process.stderr.write(`검증 실패: ${error.message}\n`)
    process.exitCode = 1
  }
}
