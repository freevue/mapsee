const impacts = ['blocking', 'degraded', 'presentation', 'undetermined']
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const requireValue = (condition, reason) => {
  if (!condition) throw new Error(reason)
}

export const summarizeProblems = (report) => {
  const requested = report.scope?.triageVersion != null
  requireValue(!requested || report.scope.triageVersion === 1, '지원하지 않는 문제 분류 버전입니다.')
  if (!requested && !report.findings.some((finding) => finding.issue != null)) return undefined
  const groups = new Map()
  const untriaged = []
  for (const finding of report.findings) {
    const issue = finding.issue
    const isProblem = ['mismatch', 'review'].includes(finding.status)
    if (!issue) {
      if (isProblem) untriaged.push(finding.id)
      continue
    }
    requireValue(isProblem, '문제 분류는 불일치 또는 검토 항목에만 적용합니다.')
    requireValue(['groupId', 'cause', 'ownerPath', 'reason'].every((key) => isText(issue[key])), '문제의 원인·소유 위치·영향 근거가 필요합니다.')
    requireValue(impacts.includes(issue.impact) && isText(finding.subject?.path), '문제 영향 또는 실제 사용 위치가 잘못됐습니다.')
    const group = groups.get(issue.groupId) ?? {
      id: issue.groupId, cause: issue.cause, ownerPath: issue.ownerPath,
      findingIds: [], locations: [], impacts: [],
    }
    requireValue(group.cause === issue.cause && group.ownerPath === issue.ownerPath, '같은 문제 그룹의 원인·소유 위치가 다릅니다.')
    group.findingIds.push(finding.id)
    group.locations.push(finding.subject.path)
    group.impacts.push({ findingId: finding.id, level: issue.impact, reason: issue.reason, status: finding.status })
    groups.set(issue.groupId, group)
  }
  const result = [...groups.values()].map((group) => ({
    ...group, locations: [...new Set(group.locations)],
    impact: impacts.find((level) => group.impacts.some((entry) => entry.level === level)),
    undeterminedImpact: group.impacts.some((entry) => entry.level === 'undetermined'),
  })).sort((first, second) => impacts.indexOf(first.impact) - impacts.indexOf(second.impact) || first.id.localeCompare(second.id))
  return { groupCount: result.length, findingCount: result.reduce((count, group) => count + group.findingIds.length, 0), untriaged, groups: result }
}
