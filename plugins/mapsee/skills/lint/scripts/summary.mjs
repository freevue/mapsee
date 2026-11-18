const axes = ['component-usage', 'page-consistency']
const statuses = ['match', 'mismatch', 'review', 'not-measured', 'not-applicable']
const requireValue = (condition, reason) => {
  if (!condition) throw new Error(reason)
}
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const percent = (numerator, denominator) =>
  denominator === 0 ? null : Math.round((numerator / denominator) * 10000) / 100

const summarizeAxis = (findings, axis) => {
  const selected = findings.filter((finding) => finding.axis === axis)
  const count = (status) => selected.filter((finding) => finding.status === status).length
  const matched = count('match')
  const mismatched = count('mismatch')
  const notApplicable = count('not-applicable')
  const evaluated = matched + mismatched
  const eligible = selected.length - notApplicable
  return {
    total: selected.length,
    matched,
    mismatched,
    review: count('review'),
    notMeasured: count('not-measured'),
    notApplicable,
    evaluated,
    eligible,
    matchRate: percent(matched, evaluated),
    coverage: percent(evaluated, eligible),
  }
}

export const summarizeReport = (report) => {
  requireValue(report?.schemaVersion === 1, '보고서 schemaVersion은 1이어야 합니다.')
  requireValue(report.producer === 'mapsee' && report.mode === 'report-only', '맵시 보고서가 아닙니다.')
  requireValue(['complete', 'incomplete', 'blocked'].includes(report.runStatus), '실행 상태가 잘못됐습니다.')
  requireValue(Array.isArray(report.findings), 'findings 배열이 필요합니다.')
  const comparisons = new Map()
  for (const comparison of report.scope?.comparisons ?? []) {
    requireValue(isText(comparison?.id) && !comparisons.has(comparison.id), '비교 ID가 없거나 중복입니다.')
    comparisons.set(comparison.id, comparison)
  }
  const ids = new Set()
  for (const finding of report.findings) {
    requireValue(isText(finding?.id) && !ids.has(finding.id), '검사 ID가 없거나 중복입니다.')
    ids.add(finding.id)
    requireValue(axes.includes(finding.axis), '검사 축이 잘못됐습니다.')
    requireValue(['static', 'measurement', 'review'].includes(finding.kind), '근거 수집 방법이 잘못됐습니다.')
    requireValue(statuses.includes(finding.status), '판정 상태가 잘못됐습니다.')
    const decided = ['match', 'mismatch'].includes(finding.status)
    if (decided) {
      requireValue(isText(finding.criterion?.path) && isText(finding.criterion?.section), '판정 기준의 경로·문단이 필요합니다.')
      requireValue(finding.expected != null && finding.observed != null, '판정에는 기대값·관찰값이 필요합니다.')
      requireValue(Array.isArray(finding.evidence) && finding.evidence.some((entry) => isText(entry?.source)), '판정 근거가 필요합니다.')
    }
    if (finding.axis === 'page-consistency') {
      const comparison = comparisons.get(finding.comparisonId)
      requireValue(comparison, '페이지 검사의 비교 대상을 찾을 수 없습니다.')
      if (decided)
        requireValue(isText(comparison.target) && isText(comparison.reference) && comparison.target !== comparison.reference, '서로 다른 대상·비교 페이지가 필요합니다.')
    }
    if (['not-measured', 'not-applicable'].includes(finding.status))
      requireValue(Array.isArray(finding.limitations) && finding.limitations.some(isText), '미측정·예외의 이유가 필요합니다.')
    if (finding.status === 'not-applicable')
      requireValue(isText(finding.criterion?.path), '예외의 기준 출처가 필요합니다.')
    if (finding.status === 'not-measured')
      requireValue(report.runStatus !== 'complete', '미측정 항목이 있는 보고서는 complete가 아닙니다.')
  }
  return {
    ...report,
    summary: {
      componentUsage: summarizeAxis(report.findings, 'component-usage'),
      pageConsistency: summarizeAxis(report.findings, 'page-consistency'),
    },
  }
}
