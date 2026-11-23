import { bindingIssue } from './bindings.mjs'

const isText = (value) => typeof value === 'string' && value.trim().length > 0
const requireValue = (condition, reason) => {
  if (!condition) throw new Error(reason)
}

export const summarizeInventory = (report) => {
  const inventory = report.scope?.inventory
  const strict = report.scope?.bindingVersion != null
  requireValue(!strict || report.scope.bindingVersion === 1, '지원하지 않는 근거 연결 버전입니다.')
  requireValue(!strict || Array.isArray(inventory), '강화 연결에는 inventory 배열이 필요합니다.')
  if (inventory == null) return undefined
  requireValue(Array.isArray(inventory), '검사 대상 inventory 배열이 필요합니다.')
  const findings = new Map(report.findings.map((finding) => [finding.id, finding]))
  const ids = new Set()
  const bindingIssues = []
  const counts = { discovered: inventory.length, checked: 0, pending: 0, outOfScope: 0 }
  for (const item of inventory) {
    requireValue(isText(item?.id) && !ids.has(item.id), '대상 ID가 없거나 중복입니다.')
    ids.add(item.id)
    requireValue(['page', 'usage', 'state'].includes(item.kind), '검사 대상 종류가 잘못됐습니다.')
    requireValue(isText(item.path) && isText(item.role), '검사 대상 경로·역할이 필요합니다.')
    requireValue(['inspect', 'out-of-scope'].includes(item.disposition), '검사 대상 범위가 잘못됐습니다.')
    requireValue(Array.isArray(item.findingIds) && new Set(item.findingIds).size === item.findingIds.length, '대상의 검사 ID 배열이 없거나 중복입니다.')
    if (item.disposition === 'out-of-scope') {
      requireValue(isText(item.reason) && item.findingIds.length === 0, '범위 제외에는 이유와 빈 검사 목록이 필요합니다.')
      counts.outOfScope += 1
      continue
    }
    for (const id of item.findingIds)
      requireValue(findings.has(id), `대상 ${item.id}의 검사 ${id}가 보고서에 없습니다.`)
    const issues = strict ? item.findingIds.flatMap((id) => {
      const finding = findings.get(id)
      const reason = finding.status === 'not-measured' ? undefined : bindingIssue(item, finding)
      return reason ? [{ targetId: item.id, findingId: id, reason }] : []
    }) : []
    bindingIssues.push(...issues)
    const pending = issues.length > 0 || item.findingIds.length === 0 || item.findingIds.some((id) => findings.get(id).status === 'not-measured')
    if (pending) counts.pending += 1
    else counts.checked += 1
  }
  requireValue(counts.pending === 0 || report.runStatus !== 'complete', '미검사 대상이 있으면 실행 상태는 complete가 아닙니다.')
  return { ...counts, ...(strict ? { bindingVersion: 1, bindingIssues } : {}) }
}
