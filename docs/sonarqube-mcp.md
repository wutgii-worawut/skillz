# sonarqube MCP: ตั้งค่า และเปิด/ปิด Docker

skill `sonar-*` อ่านผลจาก SonarQube ผ่าน sonarqube MCP ซึ่งรันเป็น Docker container — **Docker ต้องเปิดอยู่ทุกครั้งที่ใช้ skill**

```
Claude Code  →  MCP server (docker: mcp/sonarqube)  →  SonarQube server
```

- Docker รันแค่ตัวกลาง (MCP server) ไม่ได้รัน SonarQube
- Docker ไม่เปิด → `/mcp` ขึ้น `CONNECTION_CLOSED` และ skill ใช้ไม่ได้
- ในเอกสารนี้ `<url>` = URL ของ SonarQube (เช่น `https://sonar.example.com/sonarqube` — มี path ถ้า server มี, ไม่มี `/` ปิดท้าย) และ `<token>` = token ของคุณ

## ตั้งค่าครั้งแรก

### 1. มี Docker

- **Windows**: ติดตั้ง Docker Desktop
- **Linux**: ติดตั้ง Docker Engine ตาม [docs.docker.com/engine/install](https://docs.docker.com/engine/install/) แล้วทำ [ใช้ docker ได้โดยไม่ต้อง sudo](#linux-ใช้-docker-ได้โดยไม่ต้อง-sudo)

เช็ก: `docker --version` ขึ้นเลข version

### 2. สร้าง User Token

1. เปิด `<url>` → login
2. รูปโปรไฟล์มุมขวาบน → **My Account** → แท็บ **Security**
3. **Generate Tokens** → Name: ตั้งเอง (เช่น `claude-mcp`) · Type: **User Token** · Expires: ตามต้องการ
4. กด **Generate** → copy ทันที (แสดงครั้งเดียว)

| token | ขึ้นต้น | ใช้กับ skill |
|---|---|---|
| User Token | `squ_` | ✅ ใช้ได้ทุกอย่าง |
| Project Analysis Token | `sqp_` | ⚠️ ดู issue ได้ แต่ดู Quality Gate ไม่ได้ (`Insufficient privileges`) |
| Global Analysis Token | `sqa_` | ❌ ใช้สั่ง scan เท่านั้น |

### 3. ดาวน์โหลด image

```bash
docker pull mcp/sonarqube
```

### 4. เพิ่ม MCP ให้ Claude Code

พิมพ์บรรทัดเดียว (Windows ใช้ได้ทั้ง PowerShell และ cmd):

```bash
claude mcp add sonarqube --scope user --env SONARQUBE_URL=<url> --env SONARQUBE_TOKEN=<token> -- docker run -i --rm -e SONARQUBE_URL -e SONARQUBE_TOKEN mcp/sonarqube
```

- ชื่อต้องเป็น `sonarqube` — skill อ้างชื่อนี้
- `--scope user` = ใช้ได้ทุกโปรเจกต์บนเครื่อง token เก็บใน `~/.claude.json`
- SonarQube รันในเครื่องตัวเอง (`localhost`) → ใช้ `http://host.docker.internal:9000` แทน `localhost` (Linux เพิ่ม `--add-host=host.docker.internal:host-gateway` หลัง `docker run -i --rm`)

เช็กค่าที่บันทึก (ปิด token ก่อนส่งให้ใครดู):

```bash
claude mcp get sonarqube
```

### 5. ทดสอบ

เปิด Docker ([Windows](#windows) / [Linux](#linux)) → เปิด Claude Code ใหม่ → `/mcp` → `sonarqube` ต้องขึ้น **connected** → ลอง `/sonar-report`

## ใช้งานประจำวัน

### Windows

1. เปิด **Docker Desktop** → รอจนสถานะขึ้น running
2. เช็ก: `docker ps` ต้องแสดงตาราง (ไม่ error)
3. เปิด Claude Code → `/mcp` → `sonarqube` ต้อง **connected**
4. ใช้เสร็จ: ปิด Docker Desktop ได้ (ถ้าไม่มี container อื่นที่ต้องใช้ — ดู `docker ps`)

### Linux

ตั้งให้ Docker เปิดเฉพาะตอนใช้ (ไม่เปลืองทรัพยากรตอนไม่ได้ใช้)

**เปิด**

```bash
sudo systemctl start docker
```

แล้วเปิด Claude Code → `/mcp` → `sonarqube` ต้อง **connected**

**เช็กก่อนปิด** — `systemctl stop` หยุด **container ทุกตัวบนเครื่อง** ไม่ใช่แค่ของเรา

1. ออกจาก Claude Code ทุกหน้าต่าง (`/exit`) — container `mcp/sonarqube` จะหยุดเอง
2. ดู container ที่ยังรัน:

   ```bash
   docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
   ```

| ผลที่เห็น | ทำอะไรต่อ |
|---|---|
| ไม่มีแถวใต้หัวตาราง | ปิดได้ |
| มีแต่ `mcp/sonarqube` | ยังมี Claude เปิดค้าง → ปิดให้หมดแล้วเช็กใหม่ |
| มี container อื่น | **อย่าปิด** — มีคนอื่นใช้ Docker อยู่ |

**ปิด** — ต้องครบ 3 ตัว (ปิดแค่ `docker` ตัว `docker.socket` จะเปิดกลับมาเองเมื่อมีคำสั่ง docker)

```bash
sudo systemctl stop docker.service docker.socket containerd.service
```

เช็กว่าปิดแล้ว:

```bash
systemctl is-active docker.service docker.socket containerd.service
```

- ต้องขึ้น `inactive` ครบ 3 บรรทัด
- `docker ps` ขึ้น `Cannot connect to the Docker daemon` = ปิดแล้ว

#### Linux: เช็ก / ตั้งให้ Docker ไม่เปิดเองตอนบูต

```bash
systemctl is-enabled docker.service docker.socket containerd.service
```

| ผล | ความหมาย |
|---|---|
| `disabled` ครบ 3 บรรทัด | ไม่เปิดเองตอนบูต ✅ |
| มี `enabled` | รีบูตแล้ว Docker เปิดเอง |

ตั้งให้ไม่เปิดเอง:

```bash
sudo systemctl disable docker.service docker.socket containerd.service
```

กลับไปให้เปิดเองเหมือนเดิม (undo):

```bash
sudo systemctl enable docker.service docker.socket containerd.service
```

- มีผลกับทุกคนบนเครื่อง — เครื่องใช้ร่วมกัน เช็กหัวข้อถัดไปและถามผู้ดูแลเครื่องก่อน disable

#### Linux: เช็กว่ามีคนอื่นใช้ Docker ไหม

ทำก่อนปิด Docker หรือ disable ตอนบูต (Docker ต้องเปิดอยู่)

```bash
docker images
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.CreatedAt}}"
docker ps -aq | xargs -r docker inspect --format '{{.Name}}  restart={{.HostConfig.RestartPolicy.Name}}'
getent group docker
```

| ผล | สรุป |
|---|---|
| มีแต่ `mcp/sonarqube` / `hello-world` และกลุ่ม docker มีแค่เรา | น่าจะใช้คนเดียว — disable ตอนบูตได้ |
| มี container `restart=always` หรือ `unless-stopped` | มีคนตั้งใจให้เปิดเองหลังรีบูต — **อย่าปิด / อย่า disable** |
| มี image อื่นแต่ไม่มี container | อาจเป็นของเก่า — ถามผู้ดูแลเครื่อง |

#### Linux: ใช้ docker ได้โดยไม่ต้อง sudo

Claude เรียก `docker` เอง — ถ้าต้อง sudo MCP จะต่อไม่ได้

```bash
sudo groupadd -f docker
sudo usermod -aG docker $USER
```

**ต้อง login ใหม่** (ปิด terminal แล้วเปิดใหม่ไม่พอ):

| เข้าเครื่องแบบ | วิธี login ใหม่ |
|---|---|
| SSH | `exit` แล้วต่อใหม่ (ปิดทุกหน้าต่างที่ต่อเครื่องนี้) |
| VS Code Remote-SSH | `Ctrl+Shift+P` → **Remote-SSH: Kill VS Code Server on Host** แล้วต่อใหม่ |
| tmux / screen | `tmux kill-server` แล้วเปิดใหม่หลัง login |
| หน้าจอเครื่อง (GUI) | logout แล้ว login ใหม่ |

เช็ก (ห้ามใส่ sudo):

```bash
id | grep -o docker
docker run --rm hello-world
```

- ต้องเห็น `docker` และ `Hello from Docker!`
- เช็กก่อน login ใหม่: `sg docker -c "docker run --rm hello-world"` ผ่าน = ตั้งถูกแล้ว เหลือแค่ login ใหม่

## เปลี่ยน token

```bash
claude mcp remove sonarqube --scope user
claude mcp add sonarqube --scope user --env SONARQUBE_URL=<url> --env SONARQUBE_TOKEN=<token ใหม่> -- docker run -i --rm -e SONARQUBE_URL -e SONARQUBE_TOKEN mcp/sonarqube
```

แล้ว `/mcp` → `sonarqube` → **Reconnect** (MCP ที่รันอยู่ยังใช้ token เก่าจนกว่าจะ reconnect)

token เก่าที่เลิกใช้ → กด **Revoke** ในหน้า Security

## ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `/mcp` ขึ้น `CONNECTION_CLOSED` | Docker ยังไม่เปิด → เปิดแล้ว `/mcp` → Reconnect · ยังไม่หาย → รัน MCP เองด้านล่าง |
| `Cannot connect to the Docker daemon` | Docker ปิดอยู่ |
| `permission denied ... docker.sock` (Linux) | ยังไม่ได้ login ใหม่หลังเข้ากลุ่ม docker — `id` ต้องมี `docker` |
| `Insufficient privileges` ตอนดู Quality Gate | token เป็น `sqp_` → เปลี่ยนเป็น User Token (`squ_`) |
| เปลี่ยน token แล้วยังเหมือนเดิม | ยังไม่ได้ Reconnect ใน `/mcp` |
| `Not authorized` / `{"valid":false}` | token ผิด หมดอายุ หรือถูก revoke |
| `UnknownHost` / `timed out` | URL ผิด หรือเข้าเครือข่ายของ server ไม่ได้ (ต่อ VPN) |
| `SSL` / `PKIX` / `certificate` | server ใช้ certificate ภายใน — ต้องตั้งค่าเพิ่ม |
| `/mcp` ไม่เห็น sonarqube | ยังไม่ได้เปิด Claude Code ใหม่หลัง `claude mcp add` |

รัน MCP เองเพื่อดู error:

```bash
docker run -i --rm -e SONARQUBE_URL=<url> -e SONARQUBE_TOKEN=<token> mcp/sonarqube
```

- ค้างนิ่งไม่ขึ้นอะไร = ปกติ (รอคำสั่ง) → `Ctrl+C`
- ขึ้น error → ดูตารางด้านบน

เช็ก token ตรงกับ server:

```bash
curl -s -u <token>: <url>/api/authentication/validate
```

`{"valid":true}` = token ใช้ได้

## ข้อควรระวัง

- `~/.claude.json` มี token — ห้าม commit หรือแชร์
- MCP มีคำสั่งเปลี่ยนสถานะ issue บน server (`change_sonar_issue_status`, `change_security_hotspot_status`) — skill `sonar-*` ไม่เรียกคำสั่งพวกนี้ ถ้า Claude ขออนุญาตเรียก ให้ปฏิเสธถ้าไม่ได้ตั้งใจ
- Linux: อยู่ในกลุ่ม docker = มีสิทธิ์เทียบเท่า root บนเครื่องนั้น

## ยืนยันไม่ได้

- ฝั่ง Windows ทดสอบจริงบน Windows 11 + Docker Desktop
- ฝั่ง Linux รวบรวมจากคำสั่งที่ใช้จริงบนเครื่อง Linux เครื่องเดียว ยังไม่ได้ไล่ทดสอบครบทุกขั้นในเครื่องใหม่ และยังไม่ได้ลองทุกวิธีในตาราง login ใหม่
- แถว `SSL` / `PKIX` ในตารางปัญหายังไม่เคยเจอจริง วิธีตั้งค่า certificate ยังไม่ได้เขียน
