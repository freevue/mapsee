import assert from 'node:assert/strict'
import { existsSync, readFileSync, realpathSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

test('두 마켓플레이스가 같은 맵시 플러그인을 배포한다', () => {
  const claudeMarket = readJson(join(root, '.claude-plugin/marketplace.json'))
  const codexMarket = readJson(join(root, '.agents/plugins/marketplace.json'))
  const claudePackage = claudeMarket.plugins.find(({ name }) => name === 'mapsee')
  const codexPackage = codexMarket.plugins.find(({ name }) => name === 'mapsee')

  assert.ok(claudePackage)
  assert.ok(codexPackage)
  assert.equal(claudeMarket.name, codexMarket.name)

  const claudeRoot = realpathSync(join(root, claudePackage.source))
  const codexRoot = realpathSync(join(root, codexPackage.source.path))
  assert.equal(claudeRoot, codexRoot)

  const claude = readJson(join(claudeRoot, '.claude-plugin/plugin.json'))
  const codex = readJson(join(codexRoot, 'plugin.json'))
  assert.deepEqual([claude.name, claude.version], [codex.name, codex.version])
  assert.equal(claude.name, 'mapsee')
  assert.equal(claude.description, codex.description)
  assert.ok(existsSync(join(claudeRoot, 'skills/setup/SKILL.md')))
  assert.ok(existsSync(join(claudeRoot, 'skills/document/SKILL.md')))
  assert.ok(existsSync(join(claudeRoot, 'skills/lint/SKILL.md')))
  const presentation = codex.extensions['com.openai'].interface
  for (const asset of new Set([presentation.composerIcon, presentation.logo])) {
    assert.ok(asset.startsWith('./'))
    const path = resolve(codexRoot, asset)
    assert.ok(existsSync(path))
    assert.ok(!relative(codexRoot, realpathSync(path)).startsWith('..'))
    const png = readFileSync(path)
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.ok(png.length <= 5 * 1024 * 1024)
    assert.equal(png.readUInt32BE(16), png.readUInt32BE(20))
    assert.ok(png.readUInt32BE(16) >= 48 && png.readUInt32BE(16) <= 4096)
  }
})

test('스킬의 로컬 참조가 배포하는 플러그인 안에 포함된다', () => {
  const pluginRoot = realpathSync(join(root, 'plugins/mapsee'))
  const documents = readdirSync(pluginRoot, { recursive: true }).filter((path) =>
    path.endsWith('.md')
  )
  for (const document of documents) {
    const path = join(pluginRoot, document)
    const text = readFileSync(path, 'utf8')
    for (const match of text.matchAll(/\]\(([^\s)]+)\)/g)) {
      if (/^https?:\/\//.test(match[1])) continue
      const destination = resolve(dirname(path), match[1].split('#')[0])
      assert.ok(existsSync(destination), `${document}: ${match[1]}`)
      assert.ok(!relative(pluginRoot, realpathSync(destination)).startsWith('..'))
    }
  }
})

test('전달용 JSON 예시가 실행 상태와 항목 판정을 구분한다', () => {
  const report = readJson(
    join(root, 'plugins/mapsee/skills/lint/references/report.example.json')
  )
  assert.equal(report.producer, readJson(join(root, 'plugins/mapsee/plugin.json')).name)
  assert.equal(report.mode, 'report-only')
  assert.equal(report.runStatus, 'incomplete')
  assert.equal(new Set(report.findings.map((finding) => finding.id)).size, report.findings.length)
  for (const finding of report.findings) {
    if (finding.status === 'mismatch') {
      assert.ok(finding.criterion)
      assert.notEqual(finding.expected, null)
      assert.ok(finding.evidence.length > 0)
    }
    if (finding.status === 'not-measured') {
      assert.equal(finding.observed, null)
      assert.ok(finding.limitations.length > 0)
    }
  }
})
