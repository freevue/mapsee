import { readFile } from 'node:fs/promises'
import { checkReadiness } from './readiness.mjs'

try {
  const args = process.argv.slice(2)
  if (args.length !== 1 || args[0].startsWith('-')) throw new Error('사용법: node check-readiness.mjs 준비기록.json')
  const result = checkReadiness(JSON.parse(await readFile(args[0], 'utf8')))
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  process.exitCode = result.status === 'ready' ? 0 : 2
} catch (error) {
  process.stderr.write(`준비 검사 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n`)
  process.exitCode = 1
}
