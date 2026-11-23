import { readFile } from 'node:fs/promises'
import { planRetest } from './retest-plan.mjs'

try {
  const paths = process.argv.slice(2)
  if (paths.length !== 2 || paths.some((path) => path.startsWith('-')))
    throw new Error('사용법: node retest.mjs 보고서.json 변경파일배열.json')
  const [report, changes] = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))))
  process.stdout.write(`${JSON.stringify(planRetest(report, changes), null, 2)}\n`)
} catch (error) {
  const reason = error instanceof Error ? error.message : '알 수 없는 재검사 계획 오류'
  process.stderr.write(`재검사 계획 실패: ${reason}\n`)
  process.exitCode = 1
}
