import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { verifyEvidence } from '../plugins/mapsee/skills/lint/scripts/evidence.mjs'
import { readPointer } from '../plugins/mapsee/skills/lint/scripts/raw-source.mjs'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const fixtureFor = async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'mapsee-evidence-'))
  context.after(() => rm(directory, { recursive: true }))
  const basis = '주요 행동은 잠급니다.'
  const raw = JSON.stringify({ records: [{ disabled: true }], 'a/b': { '~': null } })
  await writeFile(join(directory, 'DESIGN.md'), basis)
  await writeFile(join(directory, 'raw.json'), raw)
  const capture = { captureId: 'pending', source: 'raw.json#/records/0', rawDigest: digest(raw),
    context: { url: '/form', state: 'pending', sequenceId: 'retry' }, data: { disabled: true } }
  const report = { schemaVersion: 1, producer: 'mapsee', mode: 'report-only', runStatus: 'complete', findings: [{
    id: 'lock', axis: 'component-usage', kind: 'measurement', status: 'match',
    criterion: { path: 'DESIGN.md', section: '대기', digest: digest(basis) },
    expected: true, observed: true, evidence: [{ kind: 'dom', ...capture, basisDigest: digest(basis) }],
  }] }
  const bundle = { version: 1, captures: [capture], criteria: [{ path: 'DESIGN.md', source: 'DESIGN.md', rawDigest: digest(basis) }] }
  return { directory, report, bundle }
}

test('원본 검사는 파일·기준·Pointer·선언된 연결을 대조하고 입력을 보존한다', async (context) => {
  const { directory, report, bundle } = await fixtureFor(context)
  const before = JSON.stringify({ report, bundle })
  const files = await Promise.all(['DESIGN.md', 'raw.json'].map((name) => readFile(join(directory, name), 'utf8')))
  const result = await verifyEvidence(report, bundle, directory)
  assert.equal(result.status, 'verified')
  assert.deepEqual([result.capturesChecked, result.criteriaChecked, result.references], [1, 1, 1])
  assert.equal(JSON.stringify({ report, bundle }), before)
  assert.deepEqual(await Promise.all(['DESIGN.md', 'raw.json'].map((name) => readFile(join(directory, name), 'utf8'))), files)
})

test('누락·교체된 원본과 잘못된 내부 위치·내용은 문제로 남긴다', async (context) => {
  const { directory, report, bundle } = await fixtureFor(context)
  const changes = [
    { source: 'missing.json#/records/0' }, { rawDigest: '0'.repeat(64) },
    { source: 'raw.json#/records/1' }, { data: { disabled: false } },
    { source: 'raw.json#/records/01' }, { source: 'raw.json#/bad~2key' },
  ]
  for (const change of changes) {
    const altered = structuredClone(bundle)
    Object.assign(altered.captures[0], change)
    const result = await verifyEvidence(report, altered, directory)
    assert.equal(result.status, 'issues')
    assert.ok(result.issues.some((issue) => issue.kind === 'capture'))
  }
})

test('기준 교체·다른 수집 ID·문맥·위치의 근거를 통과시키지 않는다', async (context) => {
  const { directory, report, bundle } = await fixtureFor(context)
  for (const field of ['captureId', 'source', 'basisDigest', 'context']) {
    const altered = structuredClone(report)
    altered.findings[0].evidence[0][field] = field === 'context' ? { state: 'default' } : 'other'
    assert.equal((await verifyEvidence(altered, bundle, directory)).status, 'issues')
  }
  await writeFile(join(directory, 'DESIGN.md'), '교체된 기준')
  const result = await verifyEvidence(report, bundle, directory)
  assert.ok(result.issues.some((issue) => issue.kind === 'criterion'))
})

test('빈 Pointer·이스케이프·null을 대조하고 상속 속성과 비정규 배열 인덱스를 거부한다', () => {
  const document = { 'a/b': { '~': null }, values: [false] }
  assert.equal(readPointer(document, ''), document)
  assert.equal(readPointer(document, '/a~1b/~0'), null)
  assert.equal(readPointer(document, '/values/0'), false)
  for (const pointer of ['/', '/toString', '/values/00', '/values/-', '/a~2b', 'values/0'])
    assert.throws(() => readPointer(document, pointer))
})

test('바이트만 검사하는 이미지는 data 없이 연결하고 해시를 확인한다', async (context) => {
  const { directory, report, bundle } = await fixtureFor(context)
  const bytes = Buffer.from([137, 80, 78, 71])
  await writeFile(join(directory, 'shot.png'), bytes)
  const capture = { ...bundle.captures[0], source: 'shot.png', rawDigest: digest(bytes) }
  delete capture.data
  bundle.captures = [capture]
  report.findings[0].evidence[0].source = 'shot.png'
  assert.equal((await verifyEvidence(report, bundle, directory)).status, 'verified')
  capture.data = {}
  assert.equal((await verifyEvidence(report, bundle, directory)).status, 'issues')
})

test('묶음 밖 파일·심볼릭 링크와 원격 주소를 읽지 않는다', async (context) => {
  const { directory, report, bundle } = await fixtureFor(context)
  const outside = await mkdtemp(join(tmpdir(), 'mapsee-outside-'))
  context.after(() => rm(outside, { recursive: true }))
  await writeFile(join(outside, 'secret.json'), '{}')
  await symlink(join(outside, 'secret.json'), join(directory, 'link.json'))
  for (const source of [join(outside, 'secret.json'), `../${outside.split('/').at(-1)}/secret.json`, 'link.json', 'https://example.com/raw.json']) {
    bundle.captures[0].source = source
    assert.equal((await verifyEvidence(report, bundle, directory)).status, 'issues')
  }
})

test('형식 오류·중복 식별자를 거부하고 연결 없는 예전 근거는 검증 완료로 만들지 않는다', async (context) => {
  const { directory, report, bundle } = await fixtureFor(context)
  await assert.rejects(() => verifyEvidence(report, { ...bundle, version: 2 }, directory), /버전/)
  await assert.rejects(() => verifyEvidence(report, { ...bundle, captures: [...bundle.captures, ...bundle.captures] }, directory), /중복/)
  delete report.findings[0].evidence[0].captureId
  assert.equal((await verifyEvidence(report, bundle, directory)).status, 'issues')
})

test('원본 검사가 통과해도 미측정 판정과 incomplete 실행 상태를 바꾸지 않는다', async (context) => {
  const { directory, report, bundle } = await fixtureFor(context)
  report.runStatus = 'incomplete'
  Object.assign(report.findings[0], { status: 'not-measured', observed: null, limitations: ['응답 역전 재현 없음'] })
  const result = await verifyEvidence(report, bundle, directory)
  assert.equal(result.status, 'verified')
  assert.equal(result.references, 0)
  assert.equal(report.runStatus, 'incomplete')
  assert.equal(report.findings[0].status, 'not-measured')
})
