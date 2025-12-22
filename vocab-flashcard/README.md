# VocabFlash - 英文單字背誦系統

使用 SM-2 間隔重複演算法的智慧單字背誦網站。

## 技術棧

- **前端**: Vite + React + TypeScript
- **樣式**: Tailwind CSS
- **後端/資料庫**: Supabase (Postgres + Auth)
- **部署**: GitHub Pages

## 功能

- 📚 單字庫管理
- 🧠 SM-2 間隔重複演算法
- 🎴 翻轉卡片複習
- 📊 學習統計追蹤
- 🔐 Google OAuth 登入

## 快速開始

### 1. 安裝依賴

```bash
cd vocab-flashcard
npm install
```

### 2. 設定 Supabase

1. 到 [Supabase](https://supabase.com) 建立新專案
2. 在 SQL Editor 執行 `supabase/migrations/001_initial_schema.sql`
3. 執行 `supabase/seed.sql` 建立測試資料
4. 到 Authentication → Providers → Google 啟用 Google OAuth
5. 複製 `.env.example` 為 `.env.local` 並填入你的 Supabase 設定

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 設定 Google OAuth

1. 到 [Google Cloud Console](https://console.cloud.google.com) 建立 OAuth 2.0 憑證
2. 設定 Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
3. 將 Client ID 和 Client Secret 填入 Supabase Dashboard

### 4. 啟動開發伺服器

```bash
npm run dev
```

### 5. 部署到 GitHub Pages

```bash
npm run deploy
```

## 專案結構

```
src/
├── components/        # React 元件
│   ├── ui/           # 基礎 UI 元件
│   ├── layout/       # 佈局元件
│   ├── deck/         # 單字庫相關
│   ├── review/       # 複習相關
│   └── stats/        # 統計相關
├── hooks/            # 自定義 Hooks
├── lib/
│   ├── supabase/     # Supabase 資料存取
│   └── sm2/          # SM-2 演算法
├── pages/            # 頁面元件
├── routes/           # 路由設定
└── types/            # TypeScript 類型
```

## SM-2 演算法

本專案使用 SuperMemo 2 (SM-2) 間隔重複演算法：

- **Again (1)**: 完全忘記，重設進度
- **Hard (3)**: 困難但記得
- **Good (4)**: 正常記住
- **Easy (5)**: 輕鬆記住

演算法會根據你的回答調整下次複習的時間間隔。

## 資料庫結構

- `decks`: 單字庫
- `words`: 單字
- `user_words`: 使用者學習進度 (SM-2 狀態)
- `review_logs`: 複習歷史紀錄

## License

MIT
