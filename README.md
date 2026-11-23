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

## 個人收藏的儲存方式

收藏清單只存在目前瀏覽器的 localStorage。清除瀏覽器網站資料、換裝置或換瀏覽器時不會自動同步。可使用頁面右上角「匯出片單」保存 JSON 備份。

## 專案結構

- index.html
- data/movies.json
- assets/css/style.css
- assets/js/app.js
- .nojekyll
- README.md
