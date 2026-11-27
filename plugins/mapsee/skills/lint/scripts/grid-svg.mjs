const escapeXml = (value) => `${value}`.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gu, '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
const format = (value) => `${Number(value.toFixed(3))}`
const colorFor = (check) => check.status === 'review' ? '#a16207' : check.withinTolerance ? '#15803d' : '#dc2626'

export const renderGridSvg = (input, result, png) => {
  const { clip } = input.capture
  const { grid, checks, context } = result
  const imageWidth = clip.width
  const width = imageWidth + 320
  const height = Math.max(clip.height + 64, 152 + checks.length * 48)
  const text = (positionX, positionY, value, color = '#334155', size = 12) =>
    `<text x="${positionX}" y="${positionY}" fill="${color}" font-size="${size}">${escapeXml(value)}</text>`
  const local = (point) => ({ x: point.x - clip.x, y: point.y - clip.y })
  const lines = checks.map((check, index) => {
    const from = local(check.from)
    const to = local(check.to)
    const projected = check.axis === 'x' ? { x: to.x, y: from.y } : { x: from.x, y: to.y }
    const color = colorFor(check)
    const segment = `<path d="M${from.x},${from.y} L${projected.x},${projected.y} L${to.x},${to.y}" fill="none" stroke="${color}" stroke-width="1.5"/>`
    const marker = `<circle cx="${from.x}" cy="${from.y}" r="3" fill="${color}"/>`
    return `${segment}${marker}${text(from.x + 5, from.y - 5, `${index + 1}`, color)}`
  }).join('\n')
  const boxes = input.elements.map(({ rect }) => `<rect x="${rect.x - clip.x}" y="${rect.y - clip.y}" width="${rect.width}" height="${rect.height}" fill="none" stroke="#475569" stroke-opacity=".45" stroke-dasharray="3 3"/>`).join('\n')
  const labels = checks.map((check, index) => {
    const positionY = 156 + index * 48
    const name = `${index + 1}. ${check.id}`
    const description = `${format(check.actual)}px → 기준 ${format(check.expected)}px · ${check.status}`
    return `${text(imageWidth + 16, positionY, name.slice(0, 36), colorFor(check))}${text(imageWidth + 16, positionY + 18, description, '#334155', 11)}`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<title>맵시 격자 검사 · ${escapeXml(context.state)}</title>
<defs><pattern id="grid" patternUnits="userSpaceOnUse" x="${grid.origin.x - clip.x}" y="${grid.origin.y - clip.y}" width="${grid.step}" height="${grid.step}">
<path d="M${grid.step},0 H0 V${grid.step}" fill="none" stroke="#2563eb" stroke-opacity=".18" stroke-width=".5"/></pattern>
<clipPath id="capture"><rect width="${imageWidth}" height="${clip.height}"/></clipPath></defs>
<rect width="100%" height="100%" fill="#f8fafc"/>
<g font-family="system-ui, sans-serif">
${text(16, 25, `맵시 · ${context.state} · ${grid.step}px 격자`, '#0f172a', 16)}
${text(16, 45, '캡처 위의 검사 표시 · CSS px · 제품 원본 보존')}
<g transform="translate(0,64)" clip-path="url(#capture)">
<image width="${imageWidth}" height="${clip.height}" href="data:image/png;base64,${png.toString('base64')}"/>
<rect width="${imageWidth}" height="${clip.height}" fill="url(#grid)"/>
${boxes}${lines}</g>
${text(imageWidth + 16, 88, '초록: 일치 · 빨강: 오류 · 황토: 검토')}
${text(imageWidth + 16, 110, grid.adopted ? '프로젝트가 채택한 기준' : '미채택 기준 · 모든 판정은 검토')}
${text(imageWidth + 16, 128, `허용 오차 ${grid.tolerance}px · 점선: 요소 경계`)}
${labels}</g></svg>\n`
}
