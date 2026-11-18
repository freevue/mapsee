import { readFile } from 'node:fs/promises'
import { summarizeReport } from './summary.mjs'

try {
  const args = process.argv.slice(2)
  if (args.length !== 1 || args[0].startsWith('-'))
    throw new Error('사용법: node summarize.mjs 보고서.json')
  const report = JSON.parse(await readFile(args[0], 'utf8'))
  process.stdout.write(`${JSON.stringify(summarizeReport(report), null, 2)}\n`)
} catch (error) {
  const reason = error instanceof Error ? error.message : '알 수 없는 집계 오류'
  process.stderr.write(`집계 실패: ${reason}\n`)
  process.exitCode = 1
}
