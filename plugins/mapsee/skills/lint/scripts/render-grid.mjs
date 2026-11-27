import { createHash } from 'node:crypto'
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { inspectGrid, validateGridInput } from './grid-input.mjs'
import { renderGridSvg } from './grid-svg.mjs'

try {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args.some((argument) => argument.startsWith('-')) || !args[1].endsWith('.svg'))
    throw new Error('사용법: node render-grid.mjs 측정.json 새결과.svg')
  const inputBytes = await readFile(args[0])
  const input = validateGridInput(JSON.parse(inputBytes.toString('utf8')))
  const root = await realpath(dirname(resolve(args[0])))
  if (isAbsolute(input.capture.path)) throw new Error('PNG는 측정 파일 폴더 안의 상대 경로여야 합니다.')
  const source = await realpath(resolve(root, input.capture.path))
  const inside = relative(root, source)
  if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) throw new Error('PNG가 측정 폴더 밖에 있습니다.')
  const png = await readFile(source)
  if (png.length < 45 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    png.readUInt32BE(8) !== 13 || png.toString('ascii', 12, 16) !== 'IHDR' || png.toString('ascii', png.length - 8, png.length - 4) !== 'IEND')
    throw new Error('PNG 캡처 형식이 잘못됐습니다.')
  const pixelWidth = png.readUInt32BE(16)
  const pixelHeight = png.readUInt32BE(20)
  const scale = pixelWidth / input.capture.clip.width
  if (pixelWidth === 0 || pixelHeight === 0 || Math.abs(pixelHeight / input.capture.clip.height - scale) > 1e-6)
    throw new Error('PNG와 CSS 캡처 영역의 종횡비가 다릅니다.')
  const result = inspectGrid(input)
  result.capture = { path: input.capture.path, clip: input.capture.clip, pixelWidth, pixelHeight, scale,
    sha256: createHash('sha256').update(png).digest('hex') }
  result.inputDigest = createHash('sha256').update(inputBytes).digest('hex')
  result.artifact = resolve(args[1])
  await writeFile(args[1], renderGridSvg(input, result, png), { flag: 'wx' })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.exitCode = result.checks.some((check) => !check.withinTolerance) ? 2 : 0
} catch (error) {
  process.stderr.write(`격자 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n`)
  process.exitCode = 1
}
