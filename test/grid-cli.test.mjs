import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { gridRecord } from './grid-support.mjs'

const cli = fileURLToPath(new URL('../plugins/mapsee/skills/lint/scripts/render-grid.mjs', import.meta.url))
const icon = fileURLToPath(new URL('../plugins/mapsee/assets/icon.png', import.meta.url))
const setup = (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mapsee-grid-'))
  context.after(() => rmSync(directory, { recursive: true }))
  copyFileSync(icon, join(directory, 'capture.png'))
  const filename = join(directory, 'measurements.json')
  const output = join(directory, 'result.svg')
  const input = gridRecord()
  const save = () => writeFileSync(filename, JSON.stringify(input))
  const run = (args = [filename, output]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
  save()
  return { directory, input, filename, output, save, run }
}

test('CLI는 PNG를 포함한 독립 SVG를 생성하고 캡처·측정 입력을 보존하며 덮어쓰기를 거부한다', (context) => {
  const fixture = setup(context)
  const before = readFileSync(fixture.filename)
  const result = fixture.run()
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  const png = readFileSync(icon)
  assert.equal(report.capture.scale, png.readUInt32BE(16) / 128)
  assert.match(report.capture.sha256, /^[a-f0-9]{64}$/u)
  assert.ok(readFileSync(fixture.output, 'utf8').includes(png.toString('base64')))
  assert.deepEqual(readFileSync(fixture.filename), before)
  assert.deepEqual(readFileSync(join(fixture.directory, 'capture.png')), png)
  const svg = readFileSync(fixture.output)
  assert.equal(fixture.run().status, 1)
  assert.deepEqual(readFileSync(fixture.output), svg)
})

test('CLI는 배수 차이를 2로 알리되 미채택 기준은 review를 유지한다', (context) => {
  const fixture = setup(context)
  fixture.input.elements[1].rect.y += 2
  fixture.input.grid.adopted = false
  fixture.save()
  const result = fixture.run()
  assert.equal(result.status, 2, result.stderr)
  assert.equal(JSON.parse(result.stdout).checks[0].status, 'review')
})

test('CLI는 잘못된 PNG·종횡비·외부 경로·외부 심볼릭 링크·인자를 거부한다', (context) => {
  const fixture = setup(context)
  for (const path of ['../outside.png', icon, 'link.png']) {
    if (path === 'link.png') symlinkSync(icon, join(fixture.directory, path))
    fixture.input.capture.path = path
    fixture.save()
    assert.equal(fixture.run().status, 1)
  }
  fixture.input.capture.path = 'capture.png'
  fixture.input.capture.clip.height = 120
  fixture.save()
  assert.equal(fixture.run().status, 1)
  fixture.input.capture.clip.height = 128
  fixture.save()
  writeFileSync(join(fixture.directory, 'capture.png'), 'PNG 아님')
  assert.equal(fixture.run().status, 1)
  for (const args of [[], ['--unknown'], [fixture.filename, fixture.filename]]) {
    const result = fixture.run(args)
    assert.equal(result.status, 1)
    assert.equal(result.stdout, '')
  }
})
