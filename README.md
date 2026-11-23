# CineScope｜全球影視收藏館

一個部署於 GitHub Pages 的個人影視海報與評分對照網站，將 Rotten Tomatoes、IMDb、豆瓣電影三個平台的評分並列展示，並同時收錄電影與劇集。

## 功能

- 電影與劇集海報牆：響應式卡片版面，支援桌面、平板與手機。
- 三站評分：Tomatometer、Popcornmeter、IMDb 與豆瓣分數分開顯示。
- 搜尋：可按中英文片名、導演、國家或類型搜尋。
- 篩選與排序：按類型、豆瓣分數、IMDb 分數、RT 影評人分數或年份排序。
- 個人片單：收藏狀態保存在目前瀏覽器的 localStorage。
- 匯出：可將已收藏作品匯出成 JSON。
- 詳情視窗：查看簡介、導演、片長、三站分數與原始平台連結。

## GitHub Pages 部署

1. 開啟此 Repository 的 Settings → Pages。
2. 在 Build and deployment 中選擇 Deploy from a branch。
3. Branch 選擇 main，資料夾選擇 /(root)，按 Save。
4. 等待 GitHub Pages 完成部署。
5. 網站網址：https://ym782.github.io/films-TVs-watching/

之後更新 data/movies.json 或網站檔案並推送到 main，GitHub Pages 會自動重新發布。

## 如何新增電影

編輯 data/movies.json 的 movies 陣列，新增一個物件。每筆電影包含：

- id：唯一識別碼。
- titleZh / titleEn：中文與英文片名。
- year、country、runtime、director、genres、summary。
- poster：海報圖片網址；建議使用你有權使用或獲授權的圖片。
- posterSource：海報來源頁面。
- ratings.tomato：Rotten Tomatoes Tomatometer（百分比）。
- ratings.popcorn：Rotten Tomatoes Popcornmeter（百分比）。
- ratings.imdb：IMDb 評分（10 分制）。
- ratings.douban：豆瓣評分（10 分制）。
- links：三個平台各自的原始作品頁面。

新增時請先核對片名、年份及版本，避免同名電影或不同剪輯版本混淆。

## 評分與資料來源說明

- 本站目前展示的是 2026-11-23 查閱的公開頁面評分快照，不是即時串流資料；平台分數會變動，新增或更新電影時請重新核對。
- Rotten Tomatoes 的 Tomatometer 是獲認可影評人的正面評價比例；Popcornmeter 是觀眾評分指標。兩者都不是 10 分制。
- IMDb 與豆瓣採用各自的用戶評分與計算方法。三個平台的評分人群及演算法不同，本站刻意分開呈現，不計算虛構的「三站平均總分」。
- 目前這個網站是純靜態 GitHub Pages 專案。沒有把私人 API Key 放進前端，也不會以未授權爬蟲假裝即時同步。若日後要自動更新，需要各平台允許使用的 API、資料授權或其他合規資料來源。
- 海報由外部來源載入，本站不擁有海報著作權。圖片可能因來源站調整、外連限制或版權要求而失效；公開或商業用途前，請取得權利人授權或改用獲授權素材。
- 本站為個人影視整理工具，與 Rotten Tomatoes、IMDb、豆瓣及海報權利人均無隸屬或官方合作關係。

## 個人收藏的儲存方式

收藏清單只存在目前瀏覽器的 localStorage。清除瀏覽器網站資料、換裝置或換瀏覽器時不會自動同步。可使用頁面右上角「匯出片單」保存 JSON 備份。

## 專案結構

- index.html
- data/movies.json
- assets/css/style.css
- assets/js/app.js
- .nojekyll
- README.md
