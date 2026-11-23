import { isDeepStrictEqual } from 'node:util'
import { checkRawSource } from './raw-source.mjs'
import { summarizeReport } from './summary.mjs'

const indexEntries = (entries, key) => {
  if (!Array.isArray(entries)) throw new Error(`${key} 색인 배열이 필요합니다.`)
  const indexed = new Map()
  for (const entry of entries) {
    if (typeof entry?.[key] !== 'string' || !entry[key].trim() || indexed.has(entry[key]))
      throw new Error(`${key} 식별자가 없거나 중복입니다.`)
    indexed.set(entry[key], entry)
  }
  return indexed
}

export const verifyEvidence = async (report, bundle, bundleRoot) => {
  summarizeReport(report)
  if (bundle?.version !== 1) throw new Error('지원하는 근거 묶음 버전은 1입니다.')
  const captures = indexEntries(bundle.captures, 'captureId')
  const criteria = indexEntries(bundle.criteria, 'path')
  const issues = []
  for (const [kind, entries] of [['capture', captures], ['criterion', criteria]]) {
    for (const [id, entry] of entries) {
      try { await checkRawSource(entry, bundleRoot) }
      catch (error) { issues.push({ kind, id, reason: error.message }) }
    }
  }
  let references = 0
  for (const finding of report.findings) {
    if (finding.status === 'not-measured') continue
    const basis = criteria.get(finding.criterion?.path)
    if (!basis || finding.criterion?.digest !== basis.rawDigest)
      issues.push({ kind: 'basis', findingId: finding.id, reason: '판정 기준과 묶음 원본 해시가 연결되지 않습니다.' })
    for (const evidence of finding.evidence ?? []) {
      references += 1
      const capture = captures.get(evidence.captureId)
      if (!capture || evidence.source !== capture.source || evidence.basisDigest !== finding.criterion?.digest ||
        !isDeepStrictEqual(evidence.context, capture.context))
        issues.push({ kind: 'reference', findingId: finding.id, captureId: evidence.captureId ?? null,
          reason: '보고서의 수집 ID·원본 위치·기준·문맥이 색인과 다릅니다.' })
    }
    if (!finding.evidence?.length)
      issues.push({ kind: 'reference', findingId: finding.id, reason: '원본에 연결한 근거가 없습니다.' })
  }
  return { version: 1, status: issues.length ? 'issues' : 'verified',
    capturesChecked: captures.size, criteriaChecked: criteria.size, references, issues,
    limitations: ['파일 동일성과 선언된 연결을 확인합니다. 캡처의 진실성·문맥의 실제 발생·판정의 타당성은 수행자가 검토합니다.'] }
}
