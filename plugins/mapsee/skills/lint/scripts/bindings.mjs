const isText = (value) => typeof value === 'string' && value.trim().length > 0
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const matchesContext = (expected, observed) => {
  if (!isObject(expected)) return JSON.stringify(expected) === JSON.stringify(observed)
  return isObject(observed) && Object.entries(expected).every(([key, value]) =>
    Object.hasOwn(observed, key) && matchesContext(value, observed[key]))
}

export const bindingIssue = (target, finding) => {
  const binding = target.binding
  if (!isObject(binding) || (!isText(binding.url) && !isText(binding.sourcePath)))
    return '대상의 URL 또는 소스 경로 연결이 없습니다.'
  if (target.kind === 'state' && !isText(binding.state)) return '상태 대상의 재현 상태가 없습니다.'
  if (target.kind === 'usage' && !isText(binding.selector) && !isText(binding.sourcePath))
    return '사용처의 요소 또는 소스 경로가 없습니다.'
  if (!Array.isArray(finding.subject?.targetIds) || !finding.subject.targetIds.includes(target.id))
    return '판정 대상이 이 대상 ID를 참조하지 않습니다.'
  if (!isText(finding.criterion?.digest)) return '판정 기준의 식별자가 없습니다.'
  const evidence = (finding.evidence ?? []).filter((entry) => entry.targetId === target.id)
  if (!evidence.some((entry) => isText(entry.captureId) && isText(entry.source) &&
    entry.basisDigest === finding.criterion.digest && matchesContext(binding, entry.context)))
    return '대상·상태·조건·기준 식별자가 맞는 수집 근거가 없습니다.'
  return undefined
}
