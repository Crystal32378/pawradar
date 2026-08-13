# 🐾 PawRadar

> **快來遇見你的狗狗大寶貝！**
> 寵物 KOL 的互動外掛 — 把散步變成日曆連結。

[![Made with Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma)](https://www.prisma.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 這是什麼？

PawRadar 不是另一個 App，是 Instagram 寵物生態系中的「互動外掛」——把寵物散步動態轉化為 `.ics` 日曆事件，讓粉絲按一下就把散步加進日曆。

**核心價值**：把「雲吸狗」從線上隨機瀏覽，變成線下的「預約制偶遇」。

## 運作流程

```
寵物 KOL                粉絲
   │                      │
   │  1. 建立散步事件      │
   │     (時間/地點/備註)   │
   │                      │
   │  2. 拿到分享連結       │
   │     /?event=meet_xxx │
   │                      │
   │  3. 貼進 IG bio       │
   │──────────────────────►│
   │                      │  4. 點連結
   │                      │     原生日曆邀請彈出
   │                      │
   │                      │  5. 按「加入日曆」
   │                      │     .ics 下載完成
   │                      │
   │                      │  6. 手機日曆自動提醒
   │                      │     散步當天「偶遇」發生
```

## 三大特色

| 特色 | 說明 |
|------|------|
| 🚀 **零摩擦** | 粉絲按一下就加入日曆，無需註冊、無需下載 App |
| 📅 **原生日曆推播** | 蘋果與谷歌的日曆提醒是最強、最不會被封鎖的推播 |
| 🔒 **隱私安全** | 只給預計地點，不揭露精確定位，主人不被即時追蹤 |

## 技術棧

- **Framework**：Next.js 16（App Router）
- **Language**：TypeScript 5
- **Database**：PostgreSQL（Neon free tier）+ Prisma ORM
- **Auth**：NextAuth.js v4（credentials provider, JWT sessions）
- **Styling**：Tailwind CSS 4 + shadcn/ui
- **State**：Zustand + React Hook Form + Zod
- **ICS Generation**：自製 RFC 5545 相容產生器（無第三方依賴）

## 專案結構

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[nextauth]/   # NextAuth handler
│   │   ├── auth/signup/       # Creator account creation
│   │   ├── dashboard/events/  # Auth'd: list/create + delete
│   │   ├── events/[slug]/     # Public: fan event detail + track KPI
│   │   └── ics/[slug]/        # Public: .ics download
│   ├── dashboard/page.tsx     # Auth'd creator dashboard
│   ├── login / signup          # Auth pages
│   ├── page.tsx                # Public landing + fan view
│   ├── layout.tsx              # Metadata + SessionProvider
│   └── globals.css             # Warm terracotta palette
├── components/
│   ├── ui/                     # shadcn/ui
│   └── pawradar/
│       ├── pawradar-shell.tsx  # Public landing shell
│       ├── dashboard-shell.tsx # Auth'd creator shell
│       ├── hero / event-form / event-list / fan-invite / nav / footer / logo
├── lib/
│   ├── auth.ts                  # NextAuth config
│   ├── auth-server.ts           # Server helpers (requireCreatorSession, requireEventOwnership)
│   ├── ics.ts                   # ICS generator (RFC 5545)
│   ├── slug.ts                  # Unique slug generator
│   ├── rate-limit.ts            # In-memory rate limiter (Phase 1 stopgap)
│   ├── validations.ts           # Zod schema
│   └── db.ts                    # Prisma client (cached on globalThis)
├── store/
│   └── pawradar.ts              # Zustand fan-view state
└── prisma/
    └── schema.prisma            # User + Event + Subscription models
```

## 部署

完整步驟見 [DEPLOY.md](DEPLOY.md) — 10 分鐘從零到上線（Vercel + Neon，全免費）。

快速版：

```bash
# 1. 設環境變數
cp .env.example .env
# 編輯 .env 填入 Neon 連結 + NEXTAUTH_SECRET

# 2. 安裝 + 初始化資料庫
bun install
bun run db:push

# 3. 本地跑
bun run dev
```

## 安全模型

PawRadar 區分三種流量：

| 路徑 | 認證 | 用途 |
|------|------|------|
| `GET /` | 公開 | 首頁 + fan view (`?event=slug`) |
| `GET /api/events/[slug]` | 公開 | Fan 取得事件詳情 |
| `GET /api/ics/[slug]` | 公開 | Fan 下載 .ics |
| `POST /api/events/[slug]/track` | 公開 (rate-limited) | KPI +1 |
| `GET/POST /dashboard` | 需登入 | KOL 後台 |
| `GET/POST /api/dashboard/events` | 需登入 | KOL 列出/建立事件 |
| `DELETE /api/dashboard/events/[slug]` | 需登入 + ownership | KOL 刪除自己事件 |

匿名訪客無法列出所有事件、無法建立事件、無法刪除他人事件。每個事件都強制 ownership 檢查。

## 商業模式（Phase 1）

這階段不收費。唯一 KPI：**有多少個日曆事件被加入**。

這個數字是未來跟寵物食品商談「地點即時贊助」的唯一籌碼。

## License

MIT — 見 [LICENSE](LICENSE)

---

**PawRadar** · 把散步變成預約制偶遇 🐾
