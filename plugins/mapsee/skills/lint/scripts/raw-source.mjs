import { createHash } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

export const readPointer = (document, pointer) => {
  if (pointer === '') return document
  if (!pointer.startsWith('/') || /~(?![01])/u.test(pointer)) throw new Error('JSON Pointer 형식이 잘못됐습니다.')
  return pointer.slice(1).split('/').reduce((value, token) => {
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~')
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key) ||
      (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/u.test(key)))
      throw new Error('JSON Pointer가 원본에 없습니다.')
    return value[key]
  }, document)
}

export const checkRawSource = async (entry, bundleRoot) => {
  if (typeof entry.source !== 'string' || !/^[a-f0-9]{64}$/u.test(entry.rawDigest))
    throw new Error('원본 상대 경로와 SHA-256 해시가 필요합니다.')
  const [filename, pointer, extra] = entry.source.split('#')
  if (!filename || isAbsolute(filename) || filename.includes('\\') || filename.includes(':') || extra !== undefined)
    throw new Error('원본은 묶음 내부의 상대 파일 경로여야 합니다.')
  const root = await realpath(bundleRoot)
  const sourcePath = await realpath(resolve(root, filename))
  const inside = relative(root, sourcePath)
  if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside) || !(await stat(sourcePath)).isFile())
    throw new Error('원본 파일이 근거 묶음 밖에 있습니다.')
  const bytes = await readFile(sourcePath)
  if (createHash('sha256').update(bytes).digest('hex') !== entry.rawDigest)
    throw new Error('원본 파일 해시가 다릅니다.')
  if (pointer !== undefined) {
    if (!Object.hasOwn(entry, 'data')) throw new Error('JSON Pointer에는 대조할 data가 필요합니다.')
    const document = JSON.parse(bytes.toString('utf8'))
    if (!isDeepStrictEqual(readPointer(document, pointer), entry.data))
      throw new Error('JSON Pointer의 원본 내용과 data가 다릅니다.')
  } else if (Object.hasOwn(entry, 'data')) throw new Error('data 대조에는 JSON Pointer가 필요합니다.')
}
