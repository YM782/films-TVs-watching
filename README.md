# CineScope｜全球影視收藏館

一個部署於 GitHub Pages 的個人影視海報與評分對照網站，並列展示 Rotten Tomatoes、IMDb、豆瓣電影的公開評分。

## 目前片庫

- **53 部作品**：25 部電影、28 部劇集／動畫。
- 類型入口：全部作品、電影、電視劇／動畫。
- 題材篩選：劇情、科幻、犯罪、動畫、懸疑、戰爭、喜劇、歷史、奇幻。
- 海報卡片：中英文片名、年份、地區、題材、導演／主創。
- 評分：Rotten Tomatoes Tomatometer、Popcornmeter、IMDb、豆瓣分數分開顯示。
- 搜尋：按中英文片名、導演、國家或類型搜尋。
- 排序：豆瓣、IMDb、爛番茄影評人分數、年份。
- 個人片單：收藏狀態保存在目前瀏覽器的 localStorage。
- 匯出：可將已收藏作品匯出成 JSON。
- 詳情視窗：查看簡介、主創、片長／集數、平台評分及原始頁面連結。


## 雜誌版面與榜單入口

首頁採用 CineScope Journal 雜誌式編排，包含刊頭、封面故事、平台評分導讀、榜單專刊及海報檔案庫。電影與劇集仍使用同一份可搜尋資料庫，並可按類型、題材及評分排序。

### 三平台榜單來源

- Rotten Tomatoes 電影：官方「300 Best Movies of All Time」編輯榜，會綜合 Tomatometer、Popcornmeter、評論數及編輯調整。
- Rotten Tomatoes 電視：目前提供「100% Certified Fresh TV Seasons」等季別專題；季評分不能直接當成整部劇集的總排名。
- IMDb 電影：官方 Top 250 Movies。
- IMDb 電視：官方 Top 250 TV Shows。
- 豆瓣電影：官方 Top 250。
- 豆瓣劇集：官方排行榜按地區、類型及其他維度瀏覽，並非一張固定的全球歷史 Top 100。

**重要：三個平台沒有完全相同的官方 Top 100 電影與 Top 100 電視劇榜單。** 首頁先提供原始榜單入口和口徑說明；本站現有 53 部作品仍是獨立的海報收藏資料庫。後續匯入榜單快照時，必須保留平台名次、查閱日期、作品版本及原始連結，不會把編輯選片或第三方榜單冒充平台官方排名。

### 收藏按鈕

點擊收藏只更新對應作品的星星、收藏數量和收藏篩選狀態，不會重新生成整個海報網格。收藏資料仍保存在目前瀏覽器的 localStorage。


## 榜單專刊（rankings.html）

- 獨立的雜誌式排行榜頁面，不會把平台不同的排名方法混成一個總分。
- IMDb 電影與電視榜：各收錄 300 部。前 250 名沿用 IMDb 公開 Top 250 榜單；第 251–300 名是 CineScope 根據 IMDb 官方非商業資料集的評分與投票數計算的延伸排名，並非 IMDb 官方 Top 300。
- IMDb 榜單資料由 `https://imdb-top250.mmdju.workers.dev` 提供前 250 名；該服務是社群代理，不是 IMDb 官方 API。第 251–300 名由 GitHub Actions 讀取 IMDb 官方非商業資料集後計算。
- **資料新鮮度：** 第三方代理可能回傳快取或種子快照，不保證每次都是即時榜單。本次生成記錄的電影 Top 250 快照日期為 2026-09-01，劇集 Top 250 為 2026-09-04；頁面會讀取 JSON 中的來源日期並顯示。第 251–300 名使用本次工作流程下載的 IMDb 公開評分資料計算。
- 海報顯示：優先使用本站已有海報，否則按 IMDb ID 載入 MetaHub 海報 CDN（`images.metahub.space/poster/medium/{imdb_id}/img`）；來源沒有圖片或圖片失效時自動回退至文字封面。
- 榜單收藏：本頁的收藏使用獨立的瀏覽器 localStorage key（`cinescope-ranking-watchlist-v1`），與首頁個人片庫收藏分開保存。
- Rotten Tomatoes 原始入口：官方影史電影 300 部榜、官方恐怖劇集 100 部榜。
- 豆瓣原始入口：電影 Top 250 與劇集分類／排行榜入口。

### 榜單口徑與限制

- IMDb 官方提供 Top 250 電影及 Top 250 電視節目；本站完整顯示這 250 名，再以公開資料集計算 50 名延伸作品。延伸排名使用最低 25,000 票及 Bayesian weighted rating，並明確標記為本站延伸榜，不會冒充 IMDb 官方排名。
- Rotten Tomatoes 的影史電影榜為 300 部；其 100 部電視榜是「恐怖類型劇集」榜，不代表全類型電視劇 Top 100。
- 豆瓣電影 Top 250 是固定電影榜；豆瓣劇集頁面提供多種分類及榜單入口，並非一份固定的全球歷史 Top 100。
- 本站不會為了湊齊六張 Top 100 而捏造平台不存在的官方榜單。需要比較時，請先確認榜單範圍、更新日期和排序方法。

## GitHub Pages 部署

1. 開啟此 Repository 的 Settings → Pages。
2. 在 Build and deployment 中選擇 Deploy from a branch。
3. Branch 選擇 main，資料夾選擇 /(root)，按 Save。
4. 等待 GitHub Pages 完成部署。
5. 網站網址：https://ym782.github.io/films-TVs-watching/

之後更新 data/movies.json 或網站檔案並推送到 main，GitHub Pages 會自動重新發布。

## 新增電影或劇集

編輯 data/movies.json 的 movies 陣列，新增一個物件。每筆作品包含：

- id：唯一識別碼。
- type：電影使用 movie；劇集或動畫使用 tv。
- titleZh / titleEn：中文與英文片名。
- year、country、runtime、director、genres、summary。
- poster：海報圖片網址。
- posterSource：海報來源頁面。
- ratings.tomato：Rotten Tomatoes Tomatometer（百分比）。
- ratings.popcorn：Rotten Tomatoes Popcornmeter（百分比）。
- ratings.imdb：IMDb 評分（10 分制）。
- ratings.douban：豆瓣評分（10 分制）。
- links：各平台的原始作品頁面或搜尋頁面。

未能核實的評分請填 null；網站會顯示「—」，不要以猜測數字補上。新增時請核對作品名稱、年份、版本及劇集季別，避免同名作品混淆。

## 評分與資料來源說明

- 本站目前展示的是 **2026-11-23 查閱的公開頁面評分快照**，不是即時串流資料；平台分數會變動，新增或更新作品時請重新核對。
- Rotten Tomatoes 的 Tomatometer 是獲認可影評人的正面評價比例；Popcornmeter 是觀眾評分指標。兩者都不是 10 分制。
- 對劇集而言，Rotten Tomatoes 可能提供整體系列平均分或單季分數；本網站以系列頁面顯示的整體分數為準，不把單季分數冒充全劇分數。
- IMDb 與豆瓣採用各自的用戶評分與計算方法。三個平台的評分人群及計算方式不同，本站刻意分開呈現，不計算虛構的「三站平均總分」。
- 目前網站是純靜態 GitHub Pages 專案，沒有把私人 API Key 放進前端，也不會以未授權爬蟲假裝即時同步。若日後要自動更新，需要各平台允許使用的 API、資料授權或其他合規資料來源。
- 海報由外部來源載入，本站不擁有海報著作權。圖片可能因來源站調整、外連限制或版權要求而失效；公開或商業用途前，請取得權利人授權或改用獲授權素材。
- 本站為個人影視整理工具，與 Rotten Tomatoes、IMDb、豆瓣及海報權利人均無隸屬或官方合作關係。


## 電影 Top 300、劇集 Top 300 與海報自動更新

排行榜資料會生成到 `data/rankings-top300.json`，由 GitHub Pages 直接讀取，不需要訪客在瀏覽器等待第三方榜單 API。

### 排名方法

1. 第 1–250 名：使用 IMDb 公開 Top 250 電影榜與 Top 250 電視榜快照。
2. 第 251–300 名：從 IMDb 官方非商業資料集中選出尚未進入前 250 名的作品。
3. 延伸作品最低投票數為 25,000；按 IMDb 評分與投票數計算 Bayesian weighted rating，減少低票數作品因平均分偏高而排得過前。
4. 電影只收錄 feature movie（片長至少 45 分鐘）；電視收錄 TV Series 及 TV Mini Series。
5. 第 251–300 名是 CineScope 自訂延伸排名，**不是 IMDb 官方 Top 300**。頁面及資料檔會保留此說明。

### 海報圖片

- 前端先使用 `data/movies.json` 中已有的海報。
- 沒有本地海報時，按 IMDb ID 載入 MetaHub 圖片 CDN：`https://images.metahub.space/poster/medium/{imdb_id}/img`。
- 圖片載入失敗會自動移除破圖並顯示雜誌式文字封面。
- 不需要 TMDb API Token，也不會把任何私人金鑰放進前端。
- 海報由第三方 CDN 提供，本站不擁有圖片著作權；圖片可用性及授權以來源服務和權利人條款為準。

### 自動生成與更新

GitHub Actions 工作流程：`.github/workflows/build-top300-catalog.yml`。

- 支援手動執行：Repository → Actions → Build IMDb Top 300 Catalog → Run workflow。
- 每週自動更新一次。
- 修改排名生成程式或工作流程時會自動觸發。
- 工作流程下載 IMDb 官方公開資料集、產生 300 部電影及 300 部劇集資料，並提交至 `data/rankings-top300.json`。
- 不需要設定 API Secret。

### 資料來源與使用限制

- [IMDb Top 250 Movies](https://www.imdb.com/chart/top/)
- [IMDb Top 250 TV Shows](https://www.imdb.com/chart/toptv/)
- [IMDb 官方非商業資料集](https://developer.imdb.com/non-commercial-datasets/)
- [IMDb Top 250 社群 JSON 代理原始碼](https://github.com/mmdju/imdb-top250-api)
- [MetaHub 海報 CDN 範例與格式](https://docs.emet.live/addon-guide/meta/)

IMDb 官方資料集只供個人及非商業用途，使用前須遵守 IMDb 的非商業資料集條款。本站不是 IMDb、MetaHub 或其他影視平台的官方產品。

## 個人收藏的儲存方式

收藏清單只存在目前瀏覽器的 localStorage。清除瀏覽器網站資料、換裝置或換瀏覽器時不會自動同步。可使用頁面右上角「匯出片單」保存 JSON 備份。

## 專案結構

- index.html
- data/movies.json
- assets/css/style.css
- assets/js/app.js
- .nojekyll
- README.md
