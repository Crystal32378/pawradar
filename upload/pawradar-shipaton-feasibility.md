# PawRadar → Shipaton 可行性評估

> 產出日期：2026-08-13 ｜ 狀態：read-only 研究，未修改任何程式碼
> Repo 來源：https://github.com/Crystal32378/pawradar
> Shipaton 官方：https://revenuecat-shipaton-2026.devpost.com/

## 核心結論

「改視覺 + 拿掉 Columbia 字樣」成本極低（約半天、零風險），但真正的成本在 mobile 化：pawradar 是 full-stack app（Prisma + PostgreSQL + 5 個 API routes），無法像中元普渡那樣直接 static export 包 Capacitor，需要處理遠端 API 依賴與部署。

## Columbia 字樣與視覺實際位置

| 位置 | 內容 | 類型 |
|---|---|---|
| `src/components/pawradar/hero.tsx` L24 | Columbia 校友狗聚・互動外掛 | App 內文案 |
| `src/components/pawradar/footer.tsx` L13 | v0.1 · Columbia 校友版 | App 內文案 |
| `src/app/globals.css` L47-49 | Columbia blue + white... alumni-friendly 註解 | 設計註解 |
| `src/app/globals.css` L59 | --primary: oklch(0.62 0.15 238) /* Columbia blue */ | 主色 |
| `README.md` / `DEPLOY.md` | Columbia 校友狗聚描述 | 文件（不影響 app） |

視覺系統全走 CSS variables（oklch 色值），換色只要改 globals.css 變數區塊 + 2 個元件文案，不動業務邏輯。

## 視覺重塑 vs Shipaton mobile 化成本對比

| 項目 | 成本 | 內容 |
|---|---|---|
| 品牌重塑 | 約 0.5 天 | 改 globals.css 色票、hero 標語、footer 字樣、README。純文案與色票，零風險 |
| Shipaton mobile 化 | 約 2–3 週 | 處理 backend 依賴、RevenueCat、IAP、商店上架。主要工作量在這裡 |

## Shipaton 資格關鍵差異

| 面向 | pawradar | zhongyuan-festival |
|---|---|---|
| 資料層 | Prisma + PostgreSQL（Event model） | 無（localStorage） |
| API | 5 個 route（events CRUD / ics / track） | 無 API routes |
| 部署模式 | next build standalone + Vercel | 可 static export |
| Capacitor 包裝 | 需連遠端 API（非純靜態） | 可直接包靜態產出 |
| RevenueCat IAP | 需新增（KOL 付費方案） | 需新增（功德加倍） |

## 改造時間軸

1. **品牌重塑 — 0.5 天**：色票、文案、README。改名與否自行決定（PawRadar 名稱本身無 Columbia 色彩）。
2. **Mobile 化 — 1–2 週**：Capacitor 包裝 + API 指向遠端 HTTPS 域，確認 backend 穩定部署；或 React Native 重寫（成本高，不建議）。
3. **RevenueCat + IAP — 3–5 天**：付費點設計：KOL 免費 N 個事件、付費解鎖無限事件 / 自訂品牌頁 / 進階 KPI。
4. **商店上架 — 約 1 週（含帳號審核）**：Apple / Google 帳號、icon、screenshots、privacy policy — 需人工操作。

## 最適 Category

- **OneSignal Sponsor Award（$40K+）**：push 契合度最高（散步提醒 = 天然 push 場景）
- **Build & Grow Award**：需真實成長數據
- **RevenueCat Design Award**：視覺重塑後有機會

OneSignal 賽道是 pawradar 相對中元普渡的獨特優勢。

## 風險與建議

- ⚠️ 主要風險：pawradar web 版（paw.rs）已存在並可能公開使用。商店版「首次發布」資格符合（規則針對商店），但 Build & Grow 的成長敘事會因 web 先行而較弱。
- ✔️ 練手做完整參賽作品 → pawradar 可行，OneSignal 賽道是亮點。
- ✔️ 求 9/30 前最低風險交件 → 中元普渡仍較穩（無 backend 依賴）。
- ❌ 兩者並行不現實，建議選一個。
