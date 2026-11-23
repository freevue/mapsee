import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const cli = fileURLToPath(new URL('../plugins/mapsee/skills/lint/scripts/verify-evidence.mjs', import.meta.url))

test('원본 CLI는 실행 오류와 무결성 문제의 종료 코드를 구분하고 입력을 보존한다', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mapsee-evidence-cli-'))
  context.after(() => rmSync(directory, { recursive: true }))
  const reportPath = join(directory, 'report.json'); const bundlePath = join(directory, 'bundle.json')
  writeFileSync(reportPath, JSON.stringify({ schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete', findings: [] }))
  writeFileSync(bundlePath, JSON.stringify({ version: 1, captures: [], criteria: [] }))
  const before = readFileSync(reportPath, 'utf8')
  const success = spawnSync(process.execPath, [cli, reportPath, bundlePath], { cwd: tmpdir(), encoding: 'utf8' })
  assert.equal(success.status, 0, success.stderr)
  assert.equal(JSON.parse(success.stdout).references, 0)
  writeFileSync(bundlePath, JSON.stringify({ version: 1, criteria: [], captures: [{ captureId: 'lost', source: 'lost.json', rawDigest: '0'.repeat(64) }] }))
  const failed = spawnSync(process.execPath, [cli, reportPath, bundlePath], { encoding: 'utf8' })
  assert.equal(failed.status, 2)
  assert.equal(JSON.parse(failed.stdout).issues.length, 1)
  assert.equal(readFileSync(reportPath, 'utf8'), before)
  for (const args of [[], [reportPath], ['--unknown', bundlePath], ['missing.json', bundlePath]]) {
    const invalid = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
    assert.equal(invalid.status, 1)
    assert.equal(invalid.stdout, '')
    assert.match(invalid.stderr, /원본 검사 실패/)
  }
})
