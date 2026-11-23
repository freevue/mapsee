import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { verifyEvidence } from './evidence.mjs'

try {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args.some((argument) => argument.startsWith('-')))
    throw new Error('사용법: node verify-evidence.mjs 보고서.json 근거묶음.json')
  const [report, bundle] = await Promise.all(args.map(async (filename) => JSON.parse(await readFile(filename, 'utf8'))))
  const result = await verifyEvidence(report, bundle, dirname(resolve(args[1])))
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.exitCode = result.status === 'verified' ? 0 : 2
} catch (error) {
  const reason = error instanceof Error ? error.message : '알 수 없는 원본 검사 오류'
  process.stderr.write(`원본 검사 실패: ${reason}\n`)
  process.exitCode = 1
}
