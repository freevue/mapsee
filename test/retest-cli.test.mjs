import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const cli = fileURLToPath(new URL('../plugins/mapsee/skills/lint/scripts/retest.mjs', import.meta.url))

test('재검사 CLI는 입력을 보존하고 미연결 변경을 출력한다', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mapsee-retest-'))
  context.after(() => rmSync(directory, { recursive: true }))
  const reportPath = join(directory, 'report.json');const changesPath = join(directory, 'changes.json')
  writeFileSync(reportPath, JSON.stringify({ schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete', findings: [] }))
  writeFileSync(changesPath, JSON.stringify(['ui/Button.tsx']))
  const before = [reportPath, changesPath].map((path) => readFileSync(path, 'utf8'))
  const result = spawnSync(process.execPath, [cli, reportPath, changesPath], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout).unmappedChanges, ['ui/Button.tsx'])
  assert.deepEqual([reportPath, changesPath].map((path) => readFileSync(path, 'utf8')), before)
})

test('재검사 CLI는 잘못된 인자·없는 파일에서 성공 결과를 출력하지 않는다', () => {
  for (const paths of [[], ['--unknown', '--other'], ['없는.json', '없는.json']]) {
    const result = spawnSync(process.execPath, [cli, ...paths], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /재검사 계획 실패/)
  }
})
