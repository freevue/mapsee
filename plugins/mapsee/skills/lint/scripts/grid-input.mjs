const requireValue = (condition, reason) => { if (!condition) throw new Error(reason) }
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const isPoint = (value) => ['x', 'y'].every((key) => Number.isFinite(value?.[key]))
const isRect = (value) => isPoint(value) && ['width', 'height'].every((key) => Number.isFinite(value[key]) && value[key] > 0)
const edges = { x: ['left', 'right'], y: ['top', 'bottom'] }

export const validateGridInput = (input) => {
  requireValue(input?.version === 1, '격자 입력 버전은 1이어야 합니다.')
  const { context, capture, grid, elements, checks } = input
  requireValue(['url', 'selector', 'state'].every((key) => isText(context?.[key])), 'URL·영역 선택자·상태가 필요합니다.')
  requireValue(['width', 'height'].every((key) => Number.isFinite(context.viewport?.[key]) && context.viewport[key] > 0), '실제 CSS 뷰포트 크기가 필요합니다.')
  requireValue(isText(capture?.path) && isRect(capture.clip), 'PNG 경로와 CSS 좌표의 캡처 영역이 필요합니다.')
  const clip = capture.clip
  requireValue(clip.x >= 0 && clip.y >= 0 && clip.x + clip.width <= context.viewport.width &&
    clip.y + clip.height <= context.viewport.height, '캡처는 표시 뷰포트 안의 영역이어야 합니다.')
  const step = grid?.step ?? 4
  requireValue(Number.isFinite(step) && step > 0 && isPoint(grid?.origin), '양수 격자 간격과 원점이 필요합니다.')
  requireValue(Number.isFinite(grid.tolerance) && grid.tolerance >= 0 && grid.tolerance < step / 2, '허용 오차는 0 이상, 격자 간격 절반 미만이어야 합니다.')
  requireValue(typeof grid.adopted === 'boolean' && isText(grid.basis), '기준 채택 여부와 기준 출처 또는 미채택 사유가 필요합니다.')
  requireValue(Array.isArray(elements) && elements.length > 0, '측정 요소 배열이 필요합니다.')
  const indexed = new Map()
  for (const element of elements) {
    requireValue(isText(element?.id) && !indexed.has(element.id) && isRect(element.rect), '요소 ID가 없거나 중복이며 경계가 잘못됐습니다.')
    const rect = element.rect
    requireValue(rect.x >= clip.x && rect.y >= clip.y && rect.x + rect.width <= clip.x + clip.width &&
      rect.y + rect.height <= clip.y + clip.height, '요소가 캡처 영역 밖에 있습니다. 영역을 넓히거나 대상을 다시 정하세요.')
    indexed.set(element.id, element.rect)
  }
  requireValue(Array.isArray(checks) && checks.length > 0 && checks.length <= 100, '검사 항목은 1~100개여야 합니다.')
  const identifiers = new Set()
  for (const check of checks) {
    requireValue(isText(check?.id) && !identifiers.has(check.id), '검사 ID가 없거나 중복입니다.')
    identifiers.add(check.id)
    requireValue(['gap', 'alignment', 'grid'].includes(check.kind) && Object.hasOwn(edges, check.axis), '검사 종류 또는 축이 잘못됐습니다.')
    for (const endpoint of check.kind === 'grid' ? [check.from] : [check.from, check.to])
      requireValue(indexed.has(endpoint?.element) && edges[check.axis].includes(endpoint.edge), '검사 요소 또는 축에 맞는 경계가 필요합니다.')
  }
  return { ...input, grid: { ...grid, step } }
}

export const inspectGrid = (record) => {
  const input = validateGridInput(record)
  const { grid } = input
  const indexed = new Map(input.elements.map((element) => [element.id, element.rect]))
  const pointFor = (endpoint, axis) => {
    const rect = indexed.get(endpoint.element)
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    point[axis] = axis === 'x' ? rect.x + (endpoint.edge === 'right' ? rect.width : 0)
      : rect.y + (endpoint.edge === 'bottom' ? rect.height : 0)
    return point
  }
  const checks = input.checks.map((check) => {
    const from = pointFor(check.from, check.axis)
    const to = check.kind === 'grid' ? { ...from, [check.axis]: grid.origin[check.axis] } : pointFor(check.to, check.axis)
    const actual = check.kind === 'grid' ? from[check.axis] - to[check.axis] : to[check.axis] - from[check.axis]
    const nearest = Math.round(actual / grid.step) * grid.step
    const expected = check.kind === 'alignment' ? 0 : check.kind === 'gap' ? Math.max(0, nearest) : nearest
    const deviation = Math.abs(actual - expected)
    const withinTolerance = deviation <= grid.tolerance + 1e-9 && (check.kind !== 'gap' || actual >= 0)
    return { id: check.id, kind: check.kind, axis: check.axis, from, to, actual, expected, deviation, withinTolerance,
      status: !grid.adopted ? 'review' : withinTolerance ? 'match' : 'mismatch' }
  })
  return { version: 1, context: input.context, grid, checks,
    limitations: ['입력한 경계와 선택한 검사만 계산합니다. DOM·캡처의 동일 시점·준비 상태와 기준의 타당성은 수행자가 확인해야 합니다.',
      '배수·정렬 일치는 정보 위계·줄바꿈·가림·조작의 적합성을 보증하지 않습니다.'] }
}
