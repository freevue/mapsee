import assert from 'node:assert/strict'
import { test } from 'node:test'
import { planRetest } from '../plugins/mapsee/skills/lint/scripts/retest-plan.mjs'

const reportFor = () => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete',
  scope: { inventory: [
    { id: 'form', kind: 'page', path: '/form', role: '폼', disposition: 'inspect', findingIds: ['check'] },
    { id: 'admin', kind: 'page', path: '/admin', role: '관리', disposition: 'out-of-scope', findingIds: [], reason: '표본 밖' },
  ], dependencies: [
    { path: 'ui/Button.tsx', targetIds: ['form', 'admin'], evidence: [{ source: 'screens/form.tsx:3' }] },
    { path: 'ui/button.css', targetIds: ['form'], evidence: [{ source: 'ui/Button.tsx:1' }] },
  ] },
  findings: [{ id: 'check', axis: 'component-usage', kind: 'review', status: 'review' }],
})

test('변경 파일의 확인된 사용처와 표본 밖 영향을 묶고 입력을 보존한다', () => {
  const input = reportFor();const before = JSON.stringify(input)
  const result = planRetest(input, ['ui/Button.tsx', 'ui/button.css', 'ui/Button.tsx'])
  assert.deepEqual(result.selected.map((item) => item.targetId), ['form', 'admin'])
  assert.equal(result.selected[0].reasons.length, 2)
  assert.deepEqual(result.outOfScopeAffected, ['admin'])
  assert.deepEqual(result.unmappedChanges, [])
  assert.equal(JSON.stringify(input), before)
})

test('사용처가 없는 변경과 변경 없음은 검사 생략 승인으로 바꾸지 않는다', () => {
  const result = planRetest(reportFor(), ['app/global.css'])
  assert.deepEqual(result.unmappedChanges, ['app/global.css'])
  assert.deepEqual(result.selected, [])
  assert.ok(result.limitations.some((text) => text.includes('선택 0개')))
  assert.deepEqual(planRetest(reportFor(), []).changedFiles, [])
})

test('알 수 없는 대상·근거 없는 관계·잘못된 변경 목록을 거부한다', () => {
  const input = reportFor()
  assert.throws(() => planRetest(input, null))
  assert.throws(() => planRetest(input, ['']))
  input.scope.dependencies[0].targetIds = ['missing']
  assert.throws(() => planRetest(input, ['ui/Button.tsx']), /없는 대상/)
  const second = reportFor();second.scope.dependencies[0].evidence = []
  assert.throws(() => planRetest(second, ['ui/Button.tsx']), /근거/)
})
