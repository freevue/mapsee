import { summarizeReport } from './summary.mjs'

const isText = (value) => typeof value === 'string' && value.trim().length > 0
const hasConditions = (value) => isText(value) || (value && typeof value === 'object' && Object.keys(value).length > 0)
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  return value ?? null
}
const signature = (report, finding) => {
  const comparison = finding.axis === 'page-consistency'
    ? report.scope?.comparisons?.find((item) => item.id === finding.comparisonId)
    : null
  const conditions = finding.subject?.conditions ?? comparison?.conditions ?? report.scope?.conditions
  return {
    identified: isText(finding.subject?.path) && isText(finding.subject?.role) && hasConditions(conditions),
    value: JSON.stringify(canonical({
      axis: finding.axis, kind: finding.kind,
      subject: { path: finding.subject?.path, role: finding.subject?.role },
      criterion: finding.criterion, expected: finding.expected, conditions,
      comparison: comparison && { target: comparison.target, reference: comparison.reference, roles: comparison.roles },
    })),
  }
}

export const compareReports = (previousInput, currentInput) => {
  const previous = summarizeReport(previousInput)
  const current = summarizeReport(currentInput)
  const before = new Map(previous.findings.map((finding) => [finding.id, finding]))
  const after = new Map(current.findings.map((finding) => [finding.id, finding]))
  const changes = [...new Set([...before.keys(), ...after.keys()])].map((id) => {
    const oldFinding = before.get(id)
    const newFinding = after.get(id)
    const entry = { id, before: oldFinding?.status ?? null, after: newFinding?.status ?? null }
    if (!newFinding || newFinding.status === 'not-measured')
      return { ...entry, category: 'not-rechecked', reason: '현재 보고서에서 확인하지 못했습니다.' }
    if (!oldFinding)
      return { ...entry, category: newFinding.status === 'mismatch' ? 'new-problem' : 'added-check' }
    const oldBasis = signature(previous, oldFinding)
    const newBasis = signature(current, newFinding)
    if (!oldBasis.identified || !newBasis.identified || oldBasis.value !== newBasis.value)
      return { ...entry, category: 'changed-basis', reason: '기준·대상·방법·조건이 다르거나 조건 근거가 없습니다.' }
    if (oldFinding.status === 'mismatch' && newFinding.status === 'match')
      return { ...entry, category: 'resolved' }
    if (newFinding.status === 'mismatch')
      return { ...entry, category: oldFinding.status === 'mismatch' ? 'remaining-problem' : 'new-problem' }
    return { ...entry, category: oldFinding.status === newFinding.status ? 'unchanged' : 'changed-status' }
  })
  const categories = ['new-problem', 'resolved', 'remaining-problem', 'not-rechecked', 'changed-basis', 'added-check', 'unchanged', 'changed-status']
  return {
    schemaVersion: 1, producer: 'mapsee', mode: 'report-comparison', changes,
    counts: Object.fromEntries(categories.map((category) => [category, changes.filter((entry) => entry.category === category).length])),
    limitations: [
      '같은 프로젝트의 보고서를 원래 기준과 대조한 뒤 비교합니다. 이 도구는 프로젝트·근거의 진위를 확인하지 않습니다.',
      '같은 ID·기준·기대값·대상·방법·조건인 항목만 상태 변화를 분류합니다. 보고하지 않은 조건·기준 변경은 추론하지 않습니다.',
      'new-problem은 이번에 불일치로 확인한 항목이며 새 코드가 원인인 회귀를 뜻하지 않습니다. 비율의 증감으로 품질을 판정하지 않습니다.',
    ],
  }
}
