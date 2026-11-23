import { isDeepStrictEqual } from 'node:util'

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const requireValue = (condition, reason) => { if (!condition) throw new Error(reason) }
const indexAssets = (assets) => {
  requireValue(Array.isArray(assets), '선택한 자산 배열이 필요합니다.')
  const indexed = new Map()
  for (const asset of assets) {
    requireValue(isText(asset?.id) && !indexed.has(asset.id), '자산 ID가 없거나 중복입니다.')
    requireValue(['loaded', 'pending', 'failed', 'unknown'].includes(asset.status), '자산 상태가 잘못됐습니다.')
    indexed.set(asset.id, asset.status)
  }
  return indexed
}

export const checkReadiness = (record) => {
  requireValue(record?.version === 1, '지원하는 준비 기록 버전은 1입니다.')
  requireValue(['settled', 'transition'].includes(record.mode), '수집 방식이 잘못됐습니다.')
  const expected = record.expected
  requireValue(isObject(expected?.context) && isText(expected.context.selector), '대상 요소를 포함한 기대 문맥이 필요합니다.')
  requireValue(Number.isFinite(expected.observationMs) && expected.observationMs > 0, '관찰 구간은 양수여야 합니다.')
  requireValue(Number.isFinite(expected.maxSampleGapMs) && expected.maxSampleGapMs > 0 && expected.maxSampleGapMs <= expected.observationMs, '관찰 구간 안의 최대 측정 간격이 필요합니다.')
  requireValue(Number.isFinite(expected.geometryTolerance) && expected.geometryTolerance >= 0, '기하 허용 오차가 필요합니다.')
  requireValue(isObject(expected.opacities) && Object.keys(expected.opacities).length > 0 &&
    Object.values(expected.opacities).every((value) => Number.isFinite(value) && value >= 0 && value <= 1), '대상·조상의 기대 불투명도가 필요합니다.')
  const assets = indexAssets(expected.assets)
  requireValue([...assets.values()].every((status) => ['loaded', 'failed'].includes(status)), '기대 자산 상태는 loaded 또는 failed입니다.')
  requireValue(Array.isArray(record.samples), '실제 관찰 배열이 필요합니다.')
  const reasons = new Set()
  let previousTime = -1
  let initialRect
  for (const sample of record.samples) {
    requireValue(Number.isFinite(sample?.timeMs) && sample.timeMs >= 0 && sample.timeMs > previousTime, '관찰 시각은 음수가 아닌 증가 값이어야 합니다.')
    if (previousTime >= 0 && sample.timeMs - previousTime > expected.maxSampleGapMs)
      reasons.add('관찰 사이의 간격이 선택한 상한을 넘었습니다.')
    previousTime = sample.timeMs
    requireValue(isObject(sample.context) && typeof sample.found === 'boolean', '실제 문맥과 대상 존재 여부가 필요합니다.')
    requireValue(Number.isInteger(sample.animations) && sample.animations >= 0 && isObject(sample.opacities), '실제 애니메이션 수·불투명도가 필요합니다.')
    const observedAssets = indexAssets(sample.assets)
    if (!isDeepStrictEqual(expected.context, sample.context)) reasons.add('대상·상태·화면 조건이 기대와 다릅니다.')
    if (!sample.found) reasons.add('대상 요소가 없습니다.')
    if (sample.found) {
      requireValue(['x', 'y', 'width', 'height'].every((key) => Number.isFinite(sample.rect?.[key])), '실제 경계 값이 필요합니다.')
      if (sample.rect.width <= 0 || sample.rect.height <= 0) reasons.add('대상의 표시 영역이 없습니다.')
      initialRect ??= sample.rect
      if (Object.keys(initialRect).some((key) => ['x', 'y', 'width', 'height'].includes(key) && Math.abs(sample.rect[key] - initialRect[key]) > expected.geometryTolerance))
        reasons.add('관찰 구간에서 대상 경계가 움직였습니다.')
    }
    if (sample.animations > 0) reasons.add('대상에 영향을 주는 애니메이션이 진행 중입니다.')
    for (const [selector, opacity] of Object.entries(expected.opacities))
      if (sample.opacities[selector] !== opacity) reasons.add('대상·조상의 불투명도가 기대와 다릅니다.')
    for (const [id, status] of assets)
      if (observedAssets.get(id) !== status) reasons.add(`자산 ${id}의 상태가 기대와 다릅니다.`)
  }
  const observedMs = record.samples.length > 1 ? record.samples.at(-1).timeMs - record.samples[0].timeMs : 0
  if (record.samples.length < 2 || observedMs < expected.observationMs) reasons.add('선택한 관찰 구간의 연속 근거가 부족합니다.')
  return { version: 1, status: record.mode === 'transition' ? 'transition' : reasons.size ? 'pending' : 'ready',
    sampleCount: record.samples.length, observedMs, reasons: [...reasons],
    limitations: ['선택한 구간·요소·조상·자산의 기록만 검사합니다. 원본 진위·미래 안정성·제품 적합성을 보증하지 않습니다.'] }
}
