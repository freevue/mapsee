import { summarizeReport } from './summary.mjs'

const isText = (value) => typeof value === 'string' && value.trim().length > 0
const requireValue = (condition, reason) => {
  if (!condition) throw new Error(reason)
}

export const planRetest = (input, changedFiles) => {
  const report = summarizeReport(input)
  requireValue(Array.isArray(changedFiles) && changedFiles.every(isText), '변경 파일의 문자열 배열이 필요합니다.')
  const changes = [...new Set(changedFiles)]
  const targets = new Map((report.scope?.inventory ?? []).map((item) => [item.id, item]))
  const dependencies = report.scope?.dependencies ?? []
  requireValue(Array.isArray(dependencies), '사용처 의존 관계 배열이 필요합니다.')
  for (const dependency of dependencies) {
    requireValue(isText(dependency?.path) && Array.isArray(dependency.targetIds) && dependency.targetIds.length > 0, '의존 파일과 대상 ID가 필요합니다.')
    requireValue(Array.isArray(dependency.evidence) && dependency.evidence.some((entry) => isText(entry?.source)), '의존 관계의 원본 근거가 필요합니다.')
    requireValue(dependency.targetIds.every((id) => targets.has(id)), '의존 관계에 없는 대상 ID가 있습니다.')
  }
  const matched = dependencies.filter((dependency) => changes.includes(dependency.path))
  const ids = [...new Set(matched.flatMap((dependency) => dependency.targetIds))]
  const selected = ids.map((id) => ({
    targetId: id, path: targets.get(id).path, role: targets.get(id).role,
    disposition: targets.get(id).disposition, findingIds: targets.get(id).findingIds,
    reasons: matched.filter((dependency) => dependency.targetIds.includes(id)).map((dependency) => ({ path: dependency.path, evidence: dependency.evidence })),
  }))
  return {
    schemaVersion: 1, producer: 'mapsee', mode: 'retest-plan',
    changedFiles: changes, selected,
    unmappedChanges: changes.filter((path) => !matched.some((dependency) => dependency.path === path)),
    outOfScopeAffected: selected.filter((item) => item.disposition === 'out-of-scope').map((item) => item.targetId),
    limitations: [
      '이 도구는 에이전트가 원본 호출 경로에서 확인한 의존 관계를 대조합니다. 소스를 자동 분석하거나 모든 사용처를 보증하지 않습니다.',
      '미연결 변경·동적 경로·전역 스타일·이름 변경은 수동 검토와 범위 확대가 필요합니다. 선택 0개는 검사 생략 승인이 아닙니다.',
      '검사 목록을 제안할 뿐 실행·제품 수정·기존 CI나 필수 검증 축소를 승인하지 않습니다.',
    ],
  }
}
