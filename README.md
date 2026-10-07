# skillz

Agent skills ส่วนตัว (รูปแบบ `SKILL.md` ตามมาตรฐาน Agent Skills)

## Skills

| skill | เรียกยังไง | ทำอะไร |
|---|---|---|
| `sonar-report` | `/sonar-report [key]` หรือถามเรื่องผล Sonar | สรุป Quality Gate + issue ตาม Software Quality / Severity |
| `sonar-report-docs` | `/sonar-report-docs [key]` | สรุปแบบ `sonar-report` + เขียนเอกสารเต็มลง `./sonar/` |
| `sonar-fix` | `/sonar-fix [key] [ขอบเขต] [ยกเว้น ...] [รวดเดียว\|ทีละเฟส]` | แก้ issue ตามแผน โดยไม่เปลี่ยน business behavior |

ตอนนี้เขียนสำหรับ Claude Code และ repo payroll-line-oa (ชื่อ tool ของ Claude Code, คำสั่ง `npm run typecheck`, กลุ่ม `src/features/`)

## ต้องมี

- sonarqube MCP ชื่อ `sonarqube` ที่ต่อได้ (`/mcp` ขึ้น connected) — token แบบ User Token (`squ_`) ถึงจะดู Quality Gate ได้
- Node (สำหรับ `sonar-report-docs/build-report.mjs`)
- เพิ่ม `sonar/` ใน `.gitignore` ของโปรเจกต์ที่ใช้

## ติดตั้ง

```bash
# ลงในโปรเจกต์ปัจจุบัน
npx skills add wutgii-worawut/skillz -a claude-code

# หรือ copy เอง
cp -r skills/* <project>/.claude/skills/
```
