import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeReport } from '../plugins/mapsee/skills/lint/scripts/summary.mjs'

const findingFor = (id, path, impact = 'blocking') => ({
  id, axis: 'component-usage', kind: 'review', status: 'review', subject: { path },
  issue: { groupId: 'dialog-focus', cause: '공용 초점 처리 부재', ownerPath: 'ui/Dialog.tsx', impact, reason: '선택창을 열어도 배경 조작으로 이동함' },
})
const reportFor = (findings) => ({
  schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete',
  scope: { triageVersion: 1 }, findings,
})

test('여러 사용 위치의 공통 원인은 한 그룹으로 묶고 판정과 영향은 분리한다', () => {
  const input = reportFor([findingFor('first', 'screens/a.tsx'), findingFor('second', 'screens/b.tsx', 'undetermined')])
  const before = JSON.stringify(input)
  const summary = summarizeReport(input).problemSummary
  assert.equal(summary.groupCount, 1)
  assert.equal(summary.findingCount, 2)
  assert.deepEqual(summary.groups[0].locations, ['screens/a.tsx', 'screens/b.tsx'])
  assert.equal(summary.groups[0].impact, 'blocking')
  assert.equal(summary.groups[0].undeterminedImpact, true)
  assert.equal(summary.groups[0].impacts[0].status, 'review')
  assert.equal(JSON.stringify(input), before)
})

test('영향도 순서를 표시하고 분류하지 않은 검토를 숨기지 않는다', () => {
  const cosmetic = findingFor('style', 'screens/c.tsx', 'presentation')
  cosmetic.issue = { ...cosmetic.issue, groupId: 'spacing', cause: '여백 단계 차이', ownerPath: 'ui/styles.css' }
  const input = reportFor([cosmetic, findingFor('focus', 'screens/a.tsx'), { id: 'unknown', axis: 'component-usage', kind: 'review', status: 'review' }])
  const summary = summarizeReport(input).problemSummary
  assert.deepEqual(summary.groups.map((group) => group.id), ['dialog-focus', 'spacing'])
  assert.deepEqual(summary.untriaged, ['unknown'])
})

test('그룹 이름만 같은 다른 원인·소유 위치와 근거 없는 영향도를 거부한다', () => {
  for (const changed of [{ cause: '다른 원인' }, { ownerPath: 'other.tsx' }, { impact: 'critical' }, { reason: '' }]) {
    const second = findingFor('second', 'screens/b.tsx')
    second.issue = { ...second.issue, ...changed }
    assert.throws(() => summarizeReport(reportFor([findingFor('first', 'screens/a.tsx'), second])))
  }
})

test('이전 보고서의 무분류는 허용하고 정상 항목의 문제 분류는 거부한다', () => {
  const input = reportFor([{ id: 'old', axis: 'component-usage', kind: 'review', status: 'review' }])
  delete input.scope.triageVersion
  assert.equal(summarizeReport(input).problemSummary, undefined)
  const finding = findingFor('normal', 'screens/a.tsx')
  finding.status = 'not-measured';finding.limitations = ['화면 없음']
  assert.throws(() => summarizeReport({ ...reportFor([finding]), runStatus: 'incomplete' }), /불일치 또는 검토/)
})
