import { readFile } from 'node:fs/promises'
import { compareReports } from './history.mjs'

try {
  const paths = process.argv.slice(2)
  if (paths.length !== 2 || paths.some((path) => path.startsWith('-')))
    throw new Error('사용법: node compare.mjs 이전보고서.json 현재보고서.json')
  const reports = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))))
  process.stdout.write(`${JSON.stringify(compareReports(...reports), null, 2)}\n`)
} catch (error) {
  const reason = error instanceof Error ? error.message : '알 수 없는 비교 오류'
  process.stderr.write(`비교 실패: ${reason}\n`)
  process.exitCode = 1
}
