import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareReports } from '../plugins/mapsee/skills/lint/scripts/history.mjs'

const findingFor = (id, status) => ({
  id, status, axis: 'component-usage', kind: 'measurement',
  subject: { path: '/search', role: '주요 행동', conditions: { state: '기본', width: 390 } },
  criterion: { path: 'DESIGN.md', section: '버튼', digest: '가상-기준-1' },
  expected: 40, observed: status === 'match' ? 40 : 32,
  evidence: [{ source: '가상 DOM 기록' }], limitations: ['단위 테스트용 가상 자료'],
})
const reportFor = (findings) => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'incomplete',
  scope: { comparisons: [] }, findings,
})

test('새 불일치·해결·유지·미재검사와 추가 검사를 구분하고 입력을 보존한다', () => {
  const previous = reportFor([
    findingFor('fixed', 'mismatch'), findingFor('remaining', 'mismatch'),
    findingFor('gone', 'mismatch'), findingFor('now-broken', 'match'),
  ])
  const current = reportFor([
    findingFor('fixed', 'match'), findingFor('remaining', 'mismatch'),
    findingFor('now-broken', 'mismatch'), findingFor('new', 'mismatch'), findingFor('extra', 'match'),
  ])
  const before = JSON.stringify([previous, current])
  const result = compareReports(previous, current)
  assert.equal(result.counts.resolved, 1)
  assert.equal(result.counts['remaining-problem'], 1)
  assert.equal(result.counts['not-rechecked'], 1)
  assert.equal(result.counts['new-problem'], 2)
  assert.equal(result.counts['added-check'], 1)
  assert.equal(JSON.stringify([previous, current]), before)
})

test('기준·기대값·대상·방법·조건 변경을 해결로 만들지 않는다', () => {
  const previous = reportFor([findingFor('button', 'mismatch')])
  for (const change of [
    { criterion: { path: 'DESIGN.md', section: '버튼', digest: '가상-기준-2' } },
    { expected: 32 }, { subject: { path: '/other', role: '주요 행동', conditions: { width: 390 } } },
    { kind: 'static' }, { subject: { path: '/search', role: '주요 행동' } },
    { subject: { path: '/search', role: '주요 행동', conditions: {} } },
    { subject: { path: '/search', conditions: { state: '기본', width: 390 } } },
  ]) {
    const current = reportFor([{ ...findingFor('button', 'match'), ...change }])
    const result = compareReports(previous, current)
    assert.equal(result.counts['changed-basis'], 1)
    assert.equal(result.counts.resolved, 0)
  }
})

test('검토·예외·미측정으로 바뀐 문제를 해결로 만들지 않는다', () => {
  for (const status of ['review', 'not-applicable', 'not-measured']) {
    const result = compareReports(reportFor([findingFor('button', 'mismatch')]), reportFor([findingFor('button', status)]))
    assert.equal(result.counts.resolved, 0)
    assert.equal(result.counts[status === 'not-measured' ? 'not-rechecked' : 'changed-status'], 1)
  }
})

test('키 순서·관찰값 변경은 비교 기준을 바꾸지 않고 페이지 비교 조건 변경은 구분한다', () => {
  const before = findingFor('button', 'mismatch')
  const after = { ...before, observed: 36, subject: { ...before.subject, conditions: { width: 390, state: '기본' } } }
  assert.equal(compareReports(reportFor([before]), reportFor([after])).counts['remaining-problem'], 1)
  const previous = reportFor([{ ...before, axis: 'page-consistency', comparisonId: 'pages' }])
  previous.scope.comparisons = [{ id: 'pages', target: '/search', reference: '/settings', roles: ['주요 행동'] }]
  const current = structuredClone(previous)
  current.scope.comparisons[0].reference = '/profile'
  assert.equal(compareReports(previous, current).counts['changed-basis'], 1)
})
