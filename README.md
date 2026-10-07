# skillz

Agent skills ส่วนตัว (รูปแบบ `SKILL.md` ตามมาตรฐาน Agent Skills)

## Skills

| skill | เรียกยังไง | ทำอะไร |
|---|---|---|
| `sonar-report` | `/sonar-report [key]` หรือถามเรื่องผล Sonar | สรุป Quality Gate + issue ตาม Software Quality / Severity |
| `sonar-report-docs` | `/sonar-report-docs [key]` | สรุปแบบ `sonar-report` + เขียนเอกสารเต็มลง `./sonar/` |
| `sonar-fix` | `/sonar-fix [key] [ขอบเขต] [ยกเว้น ...] [รวดเดียว\|ทีละเฟส]` | แก้ issue ตามแผน โดยไม่เปลี่ยน business behavior |

**`[key]`** = Project Key ของ project ใน SonarQube (ไม่ใช่ชื่อโฟลเดอร์) เช่น `payroll-line-oa` ดูได้ที่หน้า project → **Project Information** → Key หรือจาก URL ของ dashboard ส่วน `?id=<key>`
ไม่ใส่ key ได้ — skill ค้นจากชื่อ repo แล้วให้เลือก

ตอนนี้เขียนสำหรับ Claude Code และ repo payroll-line-oa (ชื่อ tool ของ Claude Code, คำสั่ง `npm run typecheck`, กลุ่ม `src/features/`)

## ต้องมี

- sonarqube MCP ชื่อ `sonarqube` ที่ต่อได้ (`/mcp` ขึ้น connected) — **ต้องเปิด Docker ก่อน** ดูวิธีตั้งค่าและเปิด/ปิดที่ [docs/sonarqube-mcp.md](docs/sonarqube-mcp.md) · token แบบ User Token (`squ_`) ถึงจะดู Quality Gate ได้
- Node (สำหรับ `sonar-report-docs/build-report.mjs`)
- เพิ่ม `sonar/` ใน `.gitignore` ของโปรเจกต์ที่ใช้

## ติดตั้ง

```bash
# ลงในโปรเจกต์ปัจจุบัน
npx skills add wutgii-worawut/skillz -a claude-code

# หรือ copy เอง
cp -r skills/* <project>/.claude/skills/
```

## เอกสาร

| เอกสาร | เนื้อหา |
|---|---|
| [sonarqube-mcp.md](docs/sonarqube-mcp.md) | ตั้ง sonarqube MCP, เปิด/ปิด Docker (Windows / Linux), เปลี่ยน token, แก้ปัญหา |
