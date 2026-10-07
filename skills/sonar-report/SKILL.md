---
name: sonar-report
description: SonarQube summary report for one project — Quality Gate plus open issues by software quality and severity, read through the sonarqube MCP. Use when the user asks for Sonar results, scan results, issue counts, or Quality Gate status.
argument-hint: "[project-key]"
allowed-tools: ToolSearch, AskUserQuestion, mcp__sonarqube__search_my_sonarqube_projects, mcp__sonarqube__get_project_quality_gate_status, mcp__sonarqube__search_sonar_issues_in_projects
---

# sonar-report

รายงานสรุปแบบหน้า Overview ของ SonarQube: Gate, Software Quality, Severity — อ่านอย่างเดียว

skill นี้ใช้แค่ tool อ่านของ MCP issue หายได้ทางเดียวคือแก้โค้ดแล้วสแกนใหม่ จึงไม่เรียก `change_sonar_issue_status` / `change_security_hotspot_status` ไม่ว่ากรณีใด

tool ของ sonarqube เป็น deferred: โหลดด้วย `ToolSearch` (`select:mcp__sonarqube__...`) ก่อนเรียก ถ้าโหลดไม่ได้หรือได้ `CONNECTION_CLOSED` → หยุด แล้วบอกผู้ใช้ให้เปิด Docker แล้วพิมพ์ `/mcp` → reconnect sonarqube

## ขั้นตอน

### 1. เลือก project

token เห็นได้หลาย project การใช้ key ผิดจะได้ 0 issue แบบไม่ error เลยต้องได้ key ที่มีอยู่จริงก่อนไปต่อ

1. **มี key ใน argument** → `search_my_sonarqube_projects` (`q` = key) มี `key` ตรงตัวต่อตัว → ใช้ตัวนั้น ไม่ตรง → ใช้ argument เป็นคำค้นในข้อ 2
2. **ไม่มี key** → ถามทุกครั้ง แม้แชตนี้เคยเลือก key ไปแล้ว
   1. `search_my_sonarqube_projects` (`q` = ชื่อโฟลเดอร์ของ repo นี้ หรือคำค้นจากข้อ 1) — ค้นครั้งเดียว ห้ามค้นแบบไม่ใส่ `q`
   2. `AskUserQuestion` คำถาม "ใช้ project ไหน? (เลือก หรือพิมพ์ key / คำค้นเอง)" ตัวเลือกสูงสุด 4 ไม่ซ้ำกัน label = key เรียงตามนี้:
      1. key ที่แชตนี้ใช้ล่าสุด — description "ใช้ล่าสุด"
      2. key ที่ตรงคำค้นตัวต่อตัว — description "ตรงกับชื่อ repo"
      3. key ที่ขึ้นต้นด้วยคำค้น เรียงตามตัวอักษร — description "ขึ้นต้นด้วย <คำค้น>"
      4. key ที่มีคำค้นอยู่ข้างใน — description "มี <คำค้น>"
   3. ได้น้อยกว่า 2 ตัวเลือก (`AskUserQuestion` ต้องมีอย่างน้อย 2) → ได้ 1 ตัว: ใช้ตัวนั้นแล้วบอกว่าใช้ key อะไร · ได้ 0 ตัว: ถามคำค้นเป็นข้อความ แล้ววนข้อ 2.1 ด้วยคำนั้น
   4. ผู้ใช้พิมพ์เองแทนการเลือก → ใช้เป็นคำค้น วนข้อ 2.1

key ที่ได้จาก argument หรือจากการเลือก = ผู้ใช้ยืนยันแล้ว ไม่ต้องถามซ้ำในขั้นถัดไป

เสร็จเมื่อ: ได้ key ที่ตรงกับ `key` ในผลค้นหาตัวอักษรต่อตัวอักษร

### 2. ดึง Gate

`get_project_quality_gate_status` (`projectKey`) แล้วจัดเป็น 1 ใน 3 สถานะ:

| ผลที่ได้ | แสดง |
|---|---|
| มี `conditions` | สถานะ (✅ OK / ❌ ERROR) + ตารางเงื่อนไข: metric, ค่าจริง, เกณฑ์, ผ่าน/ไม่ผ่าน |
| `OK` แต่ `conditions` ว่าง | ⚠️ OK แต่ยังไม่ได้ตรวจ — ยังไม่มี New Code ให้ตรวจ (เช่น สแกนครั้งแรก) OK นี้ไม่ได้แปลว่าผ่านเกณฑ์ |
| error `Insufficient privileges` | ❓ ดึงไม่ได้ — token เป็น Project Analysis Token (`sqp_`) ไม่มีสิทธิ์ดู Gate ถ้าต้องการให้สร้าง User Token (`squ_`) ที่ My Account → Security → Generate Tokens → Type: User Token แล้วเปลี่ยนใน MCP |

### 3. ดึงจำนวน issue

เรียก `search_sonar_issues_in_projects` 9 ครั้ง ทุกครั้งใช้ `projects: [key]`, `issueStatuses: ["OPEN","CONFIRMED"]`, `ps: 1` แล้วอ่าน `paging.total`:

- ไม่กรอง 1 ครั้ง → ยอดรวม และ `creationDate` ของ issue ตัวแรก = issue ล่าสุด (ผลเรียงใหม่→เก่าอยู่แล้ว)
- `impactSoftwareQualities` ทีละค่า: `SECURITY`, `RELIABILITY`, `MAINTAINABILITY`
- `severities` ทีละค่า: `BLOCKER`, `HIGH`, `MEDIUM`, `LOW`, `INFO`

เรียกพร้อมกันได้ทั้ง 9 ครั้ง

เสร็จเมื่อ: มีตัวเลขครบ 9 ค่า ถ้าครั้งไหน error ให้ใส่ `?` ในช่องนั้นและบอกไว้ใน "ยืนยันไม่ได้"

### 4. แสดงผล

ใช้ template นี้ตรงตัว:

```markdown
## SonarQube: `<key>`
issue ล่าสุดสร้างเมื่อ <YYYY-MM-DD> (ใช้ประมาณวันที่สแกน)

### Quality Gate: <สถานะจากขั้น 2>
<คำอธิบาย / ตารางเงื่อนไข จากขั้น 2>

| Software Quality | Issues |
|---|---|
| Security | n |
| Reliability | n |
| Maintainability | n |

| Severity | Issues |
|---|---|
| Blocker | n |
| High | n |
| Medium | n |
| Low | n |
| Info | n |

ทั้งหมด <ยอดรวม> issues ที่ยังเปิดอยู่
(ผลรวมแต่ละตารางอาจเกินยอดรวม เพราะ issue หนึ่งตัวกระทบได้หลายด้าน — หน้าเว็บก็นับแบบนี้)

ดูต่อได้ เช่น "ดู High" / "แยกตาม feature" / "ดูไฟล์ X" · เอกสารเต็ม: `/sonar-report-docs <key>` · แก้: `/sonar-fix <key> <ขอบเขต>`
```

ถ้ามีอะไรยืนยันไม่ได้ ให้ต่อท้ายด้วยหัวข้อ **ยืนยันไม่ได้** บอกว่าคืออะไรและลองดึงจากไหน

เสร็จเมื่อ: แสดงครบทุกส่วนของ template ด้วยตัวเลขจากขั้น 3 ไม่มีตัวเลขที่ไม่ได้มาจาก MCP
