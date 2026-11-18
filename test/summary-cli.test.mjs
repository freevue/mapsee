import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const cli = fileURLToPath(new URL('../plugins/mapsee/skills/lint/scripts/summarize.mjs', import.meta.url))
const sample = fileURLToPath(new URL('../plugins/mapsee/skills/lint/references/report.example.json', import.meta.url))

test('CLI가 JSON 전체와 두 축의 요약을 출력하고 입력 파일을 보존한다', () => {
  const before = readFileSync(sample)
  const result = spawnSync(process.execPath, [cli, sample], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const report = JSON.parse(result.stdout)
  assert.equal(report.summary.componentUsage.matchRate, 50)
  assert.equal(report.summary.componentUsage.coverage, 100)
  assert.equal(report.summary.pageConsistency.matchRate, 50)
  assert.equal(report.summary.pageConsistency.coverage, 66.67)
  assert.equal(report.summary.pageConsistency.notApplicable, 1)
  assert.equal(report.runStatus, 'incomplete')
  assert.deepEqual(readFileSync(sample), before)
})

test('설정 누락·알 수 없는 옵션·없는 입력은 성공이나 가짜 요약을 출력하지 않는다', () => {
  for (const args of [[], ['--unknown'], ['없는-보고서.json']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /집계 실패/)
  }
})
