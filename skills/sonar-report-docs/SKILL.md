---
name: sonar-report-docs
description: รายงาน Sonar แบบ sonar-report แล้วเขียนเอกสารเต็ม (แยกกลุ่ม, rule, issue รายตัวตามไฟล์, ผู้สร้าง) ลง ./sonar/
argument-hint: "[project-key]"
disable-model-invocation: true
allowed-tools: ToolSearch, AskUserQuestion, mcp__sonarqube__search_my_sonarqube_projects, mcp__sonarqube__get_project_quality_gate_status, mcp__sonarqube__search_sonar_issues_in_projects, Bash(node .claude/skills/sonar-report-docs/build-report.mjs:*), Bash(date:*)
---

# sonar-report-docs

## ขั้นตอน

### 1. ทำรายงานสรุป

อ่าน `.claude/skills/sonar-report/SKILL.md` แล้วทำขั้น 1–4 ตามนั้นครบ (รวมกฎอ่านอย่างเดียวของมัน) รายงานสรุปต้องขึ้นในแชตก่อนเริ่มขั้น 2

ดึงจาก server ใหม่ทุกครั้ง แม้แชตนี้มีรายงานสรุปอยู่แล้ว — server อาจถูกสแกนใหม่ระหว่างนั้น หัวเอกสารกับ issue รายตัวต้องมาจากการดึงรอบเดียวกัน

เลือก key แล้ว = ยืนยันแล้ว ทำขั้น 2–5 ต่อได้เลยโดยไม่ถามซ้ำ

### 2. ดึง issue ทั้งหมด

`search_sonar_issues_in_projects` ด้วย `projects: [key]`, `issueStatuses: ["OPEN","CONFIRMED"]`, `ps: 500` เริ่ม `p: 1` แล้วเพิ่ม `p` จนดึงครบ `paging.total`

แต่ละหน้าต้องได้เป็นไฟล์ JSON ดิบ:
- ผลใหญ่เกิน Claude Code จะบันทึกเป็นไฟล์ให้เอง (ข้อความบอก path) → ใช้ path นั้นเลย ไม่ต้องอ่านไฟล์ทีละส่วนตามที่ข้อความแนะนำ สคริปต์ขั้น 4 อ่านครบและตรวจกับ `paging.total` ให้
- ผลแสดงในแชต → เขียน JSON ตามที่ได้ตรงตัวลง `<scratchpad>/sonar-page-<p>.json` ด้วย Write ห้ามแก้หรือตัดค่าใดๆ

เสร็จเมื่อ: มีไฟล์ครบทุกหน้า (จำนวนหน้า = ceil(total / 500))

### 3. เขียนหัวเอกสาร

เขียน `<scratchpad>/sonar-header.md`:

```markdown
# SonarQube report: `<key>`

ดึงเมื่อ <YYYY-MM-DD HH:mm> (เวลาเครื่อง)

<รายงานสรุปจากขั้น 1 ตั้งแต่ "issue ล่าสุดสร้างเมื่อ" ถึงบรรทัด "ทั้งหมด … issues" — ตัดบรรทัด "ดูต่อได้" ออก>
```

ใช้หัวข้อระดับ `###` ตามรายงานสรุปเดิม ส่วนที่สคริปต์เติมต่อจะเป็น `##`

### 4. สร้างเอกสาร

```bash
date +%Y-%m-%d-%H%M
node .claude/skills/sonar-report-docs/build-report.mjs --header <scratchpad>/sonar-header.md --out sonar/<วันเวลา>-<key>.md <page1.json> [page2.json ...]
```

สคริปต์นับทุกตัวเลขเอง ตรวจว่าจำนวน issue ตรงกับ `paging.total` (ไม่ตรง = exit พร้อม error → กลับไปดึงหน้าที่ขาด) และคืน `…` ที่ MCP ส่งมาเสีย พิมพ์ JSON สรุปผลออกมา 1 บรรทัด

เสร็จเมื่อ: สคริปต์ exit 0 และ `issues` ในผลเท่ากับยอดรวมในรายงานสรุปขั้น 1

### 5. แจ้งผล

บอก path ของเอกสาร, จำนวน issue และจำนวนไฟล์จากผลสคริปต์ ถ้า `issues` ไม่เท่ายอดรวมขั้น 1 (เช่น มีการสแกนใหม่ระหว่างดึง) ให้บอกไว้ใต้หัวข้อ **ยืนยันไม่ได้**

`sonar/` อยู่ใน `.gitignore` เอกสารจึงไม่ถูก commit
