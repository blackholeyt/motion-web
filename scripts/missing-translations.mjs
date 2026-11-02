// Lists English source texts used with t('…') that have no German translation.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const files = []
const walk = (dir) => readdirSync(dir).forEach((name) => {
  const path = join(dir, name)
  if (statSync(path).isDirectory()) walk(path)
  else if (/\.tsx?$/.test(name) && !name.includes('.test.')) files.push(path)
})
walk('src')
const ios = JSON.parse(readFileSync('src/i18n/de-ios.json', 'utf8'))
const manual = readFileSync('src/i18n/de.ts', 'utf8')
const known = new Set(Object.keys(ios))
for (const match of manual.matchAll(/^\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(\w+)):/gm)) known.add((match[1] ?? match[2] ?? match[3]).replace(/\\'/g, "'").replace(/\\n/g, '\n'))
const used = new Set()
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) used.add((match[1] ?? match[2]).replace(/\\'/g, "'").replace(/\\n/g, '\n'))
}
const missing = [...used].filter((key) => !known.has(key)).sort()
console.log(missing.map((key) => JSON.stringify(key)).join('\n'))
console.error(`${missing.length} missing of ${used.size}`)
