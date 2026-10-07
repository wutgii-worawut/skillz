// สร้างเอกสารรายงาน Sonar จากผล search_sonar_issues_in_projects (JSON ดิบ หน้าละไฟล์)
// usage: node build-report.mjs --header <header.md> --out <report.md> <page1.json> [page2.json ...]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(name)
  if (i === -1 || !args[i + 1]) throw new Error(`missing ${name}`)
  return args.splice(i, 2)[1]
}
const headerPath = opt('--header')
const outPath = opt('--out')
if (args.length === 0) throw new Error('missing issue JSON files')

// MCP ส่ง `…` มาเป็น U+FFFD 3 ตัว (UTF-8 3 ไบต์ที่ถอดผิด) — คืนค่าเป็น `…` และนับไว้แจ้งในเอกสาร
let repaired = 0
const repair = (s) =>
  s.replace(/�{3}/g, () => {
    repaired++
    return '…'
  })

const byKey = new Map()
let expectedTotal
for (const file of args) {
  const page = JSON.parse(readFileSync(file, 'utf8'))
  expectedTotal = page.paging?.total ?? expectedTotal
  for (const issue of page.issues) byKey.set(issue.key, issue)
}
const issues = [...byKey.values()]
if (expectedTotal !== undefined && issues.length !== expectedTotal) {
  throw new Error(`ได้ issue ${issues.length} ตัว แต่ paging.total = ${expectedTotal} — ดึงหน้าไม่ครบ`)
}

const SEVERITIES = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']
const path = (i) => i.component.slice(i.component.indexOf(':') + 1)
const group = (i) => {
  const p = path(i)
  const feature = /^src\/features\/([^/]+)/.exec(p)
  return feature ? `feature:${feature[1]}` : p.split('/').slice(0, 2).join('/')
}
const cell = (s) => repair(s).replaceAll('|', '\\|').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const countBy = (list, key) => {
  const counts = new Map()
  for (const i of list) counts.set(key(i), (counts.get(key(i)) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
const severityCells = (list) => SEVERITIES.map((s) => list.filter((i) => i.severity === s).length).join(' | ')
const shortRule = (r) => r.slice(r.indexOf(':') + 1)

const out = [readFileSync(headerPath, 'utf8').trimEnd(), '']

out.push(
  '## แยกตามกลุ่ม',
  '',
  '> Severity ตั้งแต่ส่วนนี้ลงไปเป็นแบบเก่า (BLOCKER/CRITICAL/MAJOR/MINOR/INFO) เพราะ MCP ไม่ส่ง High/Medium/Low รายตัวมา',
  '',
  `| กลุ่ม | รวม | ${SEVERITIES.join(' | ')} | rule |`,
  `|---|---|${SEVERITIES.map(() => '---').join('|')}|---|`,
)
for (const [g, n] of countBy(issues, group)) {
  const list = issues.filter((i) => group(i) === g)
  const rules = countBy(list, (i) => shortRule(i.rule)).map(([r, c]) => `${r}×${c}`).join(', ')
  out.push(`| ${g} | ${n} | ${severityCells(list)} | ${rules} |`)
}

out.push('', '## Rule', '', '| rule | จำนวน | ตัวอย่างข้อความ |', '|---|---|---|')
for (const [r, n] of countBy(issues, (i) => i.rule)) {
  out.push(`| ${r} | ${n} | ${cell(issues.find((i) => i.rule === r).message)} |`)
}

const files = countBy(issues, path)
out.push('', `## Issue รายตัว แยกตามไฟล์ (${files.length} ไฟล์)`)
for (const [p, n] of files) {
  const list = issues
    .filter((i) => path(i) === p)
    .sort((a, b) => (a.textRange?.startLine ?? 0) - (b.textRange?.startLine ?? 0))
  out.push('', `### \`${p}\` (${n})`, '', '| บรรทัด | Severity | Rule | ข้อความ | ผู้สร้าง |', '|---|---|---|---|---|')
  for (const i of list) {
    const author = i.author ? i.author.split('@')[0] : '-'
    out.push(`| ${i.textRange?.startLine ?? '-'} | ${i.severity} | ${shortRule(i.rule)} | ${cell(i.message)} | ${author} |`)
  }
}

out.push('', '## ผู้สร้าง issue', '', '| author | จำนวน |', '|---|---|')
for (const [a, n] of countBy(issues, (i) => i.author || '(ไม่ระบุ)')) out.push(`| ${a} | ${n} |`)

if (repaired > 0) {
  out.push('', `> ตัวอักษร \`…\` ${repaired} จุดในข้อความ rule มาจาก MCP เป็นตัวอักษรเสีย สคริปต์คืนค่าเป็น \`…\` ให้`)
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, out.join('\n') + '\n')

const latest = issues.map((i) => i.creationDate).sort().at(-1)
console.log(JSON.stringify({ out: outPath, issues: issues.length, files: files.length, latestIssue: latest, repaired }))
