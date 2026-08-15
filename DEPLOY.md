# PawRadar 部署指南（10 分鐘上線）

## 你會得到什麼

部署完成後，你會有一個公開網址（例如 `pawradar-xxx.vercel.app`），任何人打開都能用，粉絲點連結就能加入日曆。完全免費。

---

## 事前準備（5 分鐘）

你需要三個免費帳號，都用同一個 email 註冊就好：

1. **GitHub 帳號** - https://github.com/signup
2. **Vercel 帳號** - https://vercel.com/signup（直接用 GitHub 登入最快）
3. **Neon 帳號**（放資料庫）- https://neon.tech/signup（用 GitHub 登入）

---

## Step 1：把專案程式碼放到 GitHub

在 GitHub 上新增一個 repo，名稱打 `pawradar`，設為 Public 或 Private 都行。

如果你用 Terminal：

```bash
cd ~/pawradar
git init
git add .
git commit -m "PawRadar v0.1 - Columbia alumni edition"
git remote add origin https://github.com/YOUR_USERNAME/pawradar.git
git branch -M main
git push -u origin main
```

如果你沒用過 git，可以改用 GitHub Desktop：

- 下載 https://desktop.github.com/
- 登入後點「Add → Add local repository」選你的資料夾
- 按「Publish repository」就推上去了

---

## Step 2：建立 Neon 資料庫（2 分鐘）

1. 登入 https://neon.tech
2. 點「**New Project**」，名稱打 `pawradar`，region 選 `AWS US East`
3. 建好後，在 dashboard 找到「**Connection string**」，長這樣：

```text
postgresql://neondb_owner:<YOUR_NEON_PASSWORD>@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

4. 複製這串字串，等等要用。

---

## Step 3：在 Vercel 部署（3 分鐘）

1. 登入 https://vercel.com
2. 點「**Add New → Project**」
3. 應該會自動看到你的 `pawradar` repo，點「**Import**」
4. 設定頁面：
   - **Framework Preset**：選 Next.js（應該會自動偵測）
   - **Root Directory**：留空
   - **Build Command**：留預設
   - **Install Command**：留預設
5. 展開「**Environment Variables**」，新增一筆：
   - **Key**：`DATABASE_URL`
   - **Value**：貼上剛剛 Neon 複製的 connection string
   - **Environment**：Production / Preview / Development 都勾
6. 點「**Deploy**」

等 2-3 分鐘，Vercel 會自動 build + 部署。完成後你會看到一個網址：

```text
https://pawradar-xxx.vercel.app
```

---

## Step 4：初始化資料庫 schema（1 分鐘）

部署成功後，資料庫還沒有資料表。在你的電腦終端機：

```bash
cd ~/pawradar

export DATABASE_URL="postgresql://neondb_owner:<YOUR_NEON_PASSWORD>@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Windows PowerShell:
# $env:DATABASE_URL="postgresql://neondb_owner:<YOUR_NEON_PASSWORD>@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

bun install
bun run db:push
```

看到 `Your database is now in sync` 就成功了。

---

## Step 5：打開網站測試

打開 `https://pawradar-xxx.vercel.app`：

1. 應該看到「快來遇見你的狗狗大寶貝！」+ Columbia 藍配色
2. 填表建立一個散步事件 → 點「預覽邀請卡」
3. 點「加入日曆」→ 應該下載 `.ics` 檔
4. 在手機上打開那個 `.ics`，原生日曆會跳出邀請

把那個網址貼到 IG bio、傳給 Columbia 校友群組，就上線了。

---

## 之後想更新網站

每次你改了程式碼，只要：

```bash
git add .
git commit -m "改了什麼"
git push
```

Vercel 會自動偵測到 push，2 分鐘內重新部署。

---

## 常見問題

**Q: 部署失敗怎麼辦？**  
A: 在 Vercel 專案頁面點「Deployments → 點最新的那筆 → View Build Logs」，看錯誤訊息。最常見是 `DATABASE_URL` 沒設好。

**Q: 網站打開是空白？**  
A: 通常也是資料庫沒接好。回 Step 4 確認 `bun run db:push` 跑過。

**Q: 之後想換成 paw.rs 短網域？**  
A: 在 Vercel 專案 → Settings → Domains → Add，輸入你買的網域，照指示去 Namecheap/Porkbun 改 DNS 設定即可。

**Q: 免費方案夠用嗎？**  
A: Vercel Hobby 每月 100GB 流量 + Neon 免費方案 0.5GB 儲存。PawRadar 這種輕量應用，前 1000 個事件都綽綽有餘。
