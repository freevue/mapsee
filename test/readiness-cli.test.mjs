import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const cli = fileURLToPath(new URL('../plugins/mapsee/skills/lint/scripts/check-readiness.mjs', import.meta.url))

test('준비 CLI는 ready·pending·transition·입력 오류를 구분하고 원본을 보존한다', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mapsee-readiness-'))
  context.after(() => rmSync(directory, { recursive: true }))
  const filename = join(directory, 'record.json')
  const expected = { context: { selector: '#button' }, observationMs: 100, maxSampleGapMs: 100, geometryTolerance: 0,
    opacities: { '#button': 1 }, assets: [] }
  const record = { version: 1, mode: 'settled', expected, samples: [0, 100].map((timeMs) => ({
    timeMs, context: expected.context, found: true, rect: { x: 0, y: 0, width: 48, height: 48 },
    animations: 0, opacities: expected.opacities, assets: [],
  })) }
  for (const [mode, samples, status, exitCode] of [
    ['settled', record.samples, 'ready', 0], ['settled', [], 'pending', 2], ['transition', record.samples, 'transition', 2],
  ]) {
    const before = JSON.stringify({ ...record, mode, samples }); writeFileSync(filename, before)
    const result = spawnSync(process.execPath, [cli, filename], { encoding: 'utf8' })
    assert.equal(result.status, exitCode, result.stderr)
    assert.equal(JSON.parse(result.stdout).status, status)
    assert.equal(readFileSync(filename, 'utf8'), before)
  }
  for (const args of [[], ['--unknown'], ['missing.json']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
    assert.equal(result.status, 1); assert.equal(result.stdout, '')
    assert.match(result.stderr, /준비 검사 실패/)
  }
})
