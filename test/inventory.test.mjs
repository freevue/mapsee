import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeReport } from '../plugins/mapsee/skills/lint/scripts/summary.mjs'

const reportFor = () => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'incomplete',
  scope: { comparisons: [], inventory: [
    { id: 'search', kind: 'page', path: '/search', role: '검색', disposition: 'inspect', findingIds: ['button'] },
    { id: 'pending', kind: 'state', path: '/search', role: '처리 중', disposition: 'inspect', findingIds: [] },
    { id: 'admin', kind: 'page', path: '/admin', role: '관리', disposition: 'out-of-scope', findingIds: [], reason: '요청한 공개 폼 범위 밖' },
  ] },
  findings: [{ id: 'button', axis: 'component-usage', kind: 'review', status: 'review' }],
})

test('대상 누락·수집 완료·범위 제외를 두 축의 적합률과 별도로 집계한다', () => {
  const input = reportFor()
  const before = JSON.stringify(input)
  const result = summarizeReport(input)
  assert.deepEqual(result.inventorySummary, { discovered: 3, checked: 1, pending: 1, outOfScope: 1 })
  assert.equal(result.summary.componentUsage.coverage, 0)
  assert.equal(JSON.stringify(input), before)
  delete input.scope.inventory
  assert.equal(summarizeReport(input).inventorySummary, undefined)
})

test('미계획 대상이나 미측정 연결을 숨긴 complete를 거부한다', () => {
  const input = reportFor()
  input.runStatus = 'complete'
  assert.throws(() => summarizeReport(input), /미검사 대상/)
  input.scope.inventory = [input.scope.inventory[0]]
  input.runStatus = 'incomplete'
  input.findings[0] = { ...input.findings[0], status: 'not-measured', limitations: ['화면 접근 불가'] }
  assert.equal(summarizeReport(input).inventorySummary.pending, 1)
  input.runStatus = 'complete'
  assert.throws(() => summarizeReport(input))
})

test('없는 검사 연결·중복 대상·빈 제외 이유와 잘못된 형식을 거부한다', () => {
  const mutations = [
    (input) => { input.scope.inventory[0].findingIds = ['missing'] },
    (input) => { input.scope.inventory.push(input.scope.inventory[0]) },
    (input) => { input.scope.inventory[2].reason = '' },
    (input) => { input.scope.inventory[0].findingIds = ['button', 'button'] },
    (input) => { input.scope.inventory[0].kind = 'unknown' },
    (input) => { input.scope.inventory = {} },
  ]
  for (const mutate of mutations) {
    const input = reportFor()
    mutate(input)
    assert.throws(() => summarizeReport(input))
  }
})
