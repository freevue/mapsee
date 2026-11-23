import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const cli = fileURLToPath(new URL('../plugins/mapsee/skills/lint/scripts/compare.mjs', import.meta.url))

test('비교 CLI가 두 입력을 보존하고 실제 재검사 없는 항목을 해결로 만들지 않는다', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mapsee-history-'))
  context.after(() => rmSync(directory, { recursive: true }))
  const report = { schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'incomplete', findings: [{ id: 'pending', axis: 'component-usage', kind: 'review', status: 'review' }] }
  const paths = ['previous', 'current'].map((name) => join(directory, `${name}.json`))
  writeFileSync(paths[0], JSON.stringify(report))
  writeFileSync(paths[1], JSON.stringify({ ...report, findings: [] }))
  const before = paths.map((path) => readFileSync(path, 'utf8'))
  const result = spawnSync(process.execPath, [cli, ...paths], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).counts['not-rechecked'], 1)
  assert.deepEqual(paths.map((path) => readFileSync(path, 'utf8')), before)
})

test('비교 CLI는 잘못된 인자·없는 파일을 실패로 표시한다', () => {
  for (const args of [[], ['--unknown', '--other'], ['없는.json', '없는.json']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /비교 실패/)
  }
})
