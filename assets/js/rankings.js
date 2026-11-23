(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const API = {
    movie: "https://imdb-top250.mmdju.workers.dev/top250?limit=100",
    tv: "https://imdb-top250.mmdju.workers.dev/toptv?limit=100"
  };
  const WATCH_KEY = "cinescope-ranking-watchlist-v1";
  const state = { movie: [], tv: [], kind: "all", search: "", saved: new Set(), localMovies: [], posterManifest: {}, posterManifestMeta: {} };
  const chineseTitles = {
    "the shawshank redemption":"肖申克的救贖","the godfather":"教父","the dark knight":"蝙蝠俠：黑暗騎士",
    "the godfather part ii":"教父續集","the lord of the rings: the return of the king":"魔戒三部曲：王者再臨",
    "12 angry men":"十二怒漢","schindler's list":"辛德勒的名單","the lord of the rings: the fellowship of the ring":"魔戒首部曲：魔戒現身",
    "pulp fiction":"黑色追緝令","the good, the bad and the ugly":"黃昏三鏢客","forrest gump":"阿甘正傳",
    "fight club":"搏擊會","inception":"潛行凶間","the lord of the rings: the two towers":"魔戒二部曲：雙城奇謀",
    "the matrix":"廿二世紀殺人網絡","goodfellas":"四海好傢伙","one flew over the cuckoo's nest":"飛越瘋人院",
    "seven":"七宗罪","seven samurai":"七武士","it's a wonderful life":"風雲人物","the silence of the lambs":"沉默的羔羊",
    "saving private ryan":"雷霆救兵","city of god":"無主之城","the green mile":"綠里奇蹟",
    "life is beautiful":"美麗人生","terminator 2: judgment day":"未來戰士續集","interstellar":"星際啟示錄",
    "back to the future":"回到未來","spirited away":"千與千尋","the pianist":"戰地琴人",
    "gladiator":"帝國驕雄","the departed":"無間道風雲","whiplash":"鼓動人生","parasite":"上流寄生族",
    "the prestige":"死亡魔法","casablanca":"北非諜影","psycho":"觸目驚心","rear window":"後窗",
    "the intouchables":"逆轉人生","modern times":"摩登時代","cinema paradiso":"星光伴我心",
    "the lives of others":"竊聽風暴","the hunt":"誣網","grave of the fireflies":"螢火蟲之墓",
    "breaking bad":"絕命毒師","planet earth ii":"地球脈動 II","planet earth":"地球脈動",
    "band of brothers":"兄弟連","chernobyl":"核爆家園","the wire":"火線","avatar: the last airbender":"降世神通：最後的氣宗",
    "blue planet ii":"藍色星球 II","the sopranos":"黑道家族","cosmos":"宇宙","our planet":"我們的星球",
    "game of thrones":"權力遊戲","rick and morty":"瑞克和莫蒂","fullmetal alchemist: brotherhood":"鋼之鍊金術師 FULLMETAL ALCHEMIST",
    "the last of us":"最後生還者","sherlock":"新福爾摩斯","better call saul":"絕命律師",
    "the office":"辦公室風雲","the office (us)":"辦公室風雲","the twilight zone":"陰陽魔界",
    "firefly":"螢火蟲","fargo":"冰血暴","true detective":"無間警探","dark":"暗黑",
    "the boys":"黑袍糾察隊","succession":"繼承之戰","severance":"人生切割術",
    "arcane":"奧術","the crown":"王冠","peaky blinders":"浴血黑幫","fleabag":"倫敦生活",
    "black mirror":"黑鏡","stranger things":"怪奇物語","the mandalorian":"曼達洛人",
    "attack on titan":"進擊的巨人","death note":"死亡筆記","hunter x hunter":"全職獵人",
    "one piece":"海賊王","cowboy bebop":"星際牛仔","monster":"MONSTER",
    "the blue planet":"藍色星球","planet earth iii":"地球脈動 III","the world at war":"戰爭中的世界"
  };
  const normalize = value => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const showToast = message => {
    const toast = $("#rankToast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2100);
  };

  function loadSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      state.saved = new Set(Array.isArray(saved) ? saved : []);
    } catch (_) { state.saved = new Set(); }
    updateSavedCount();
  }
  function saveSaved() {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify([...state.saved])); }
    catch (_) { showToast("瀏覽器未能儲存榜單收藏。"); }
    updateSavedCount();
  }
  function updateSavedCount() {
    $("#savedCount").textContent = String(state.saved.size);
  }

  function matchLocal(item) {
    const key = normalize(item.title);
    return state.localMovies.find(movie => {
      const names = [movie.titleEn, movie.titleZh, ...(movie.aliases || [])].map(normalize);
      return names.includes(key);
    }) || null;
  }

  function makeItem(raw, kind) {
    const rawTitle = String(raw.title || raw.name || "Untitled");
    const local = matchLocal({ title: rawTitle });
    const titleZh = local?.titleZh || chineseTitles[rawTitle.toLowerCase()] || "";
    const imdbId = String(raw.id || "").match(/tt\d+/)?.[0] ||
      String(raw.imdb_id || "").match(/tt\d+/)?.[0] ||
      String(raw.url || raw.link || "").match(/tt\d+/)?.[0] || "";
    const posterRecord = state.posterManifest[imdbId] ||
      state.posterManifest[`title:${normalize(rawTitle)}`] || null;
    return {
      id: imdbId ? `imdb-${imdbId}` : `imdb-${kind}-${raw.rank}-${normalize(rawTitle)}`,
      imdbId, rank: Number(raw.rank) || 0, title: rawTitle, titleZh,
      year: raw.year || "", rating: raw.rating == null || raw.rating === "" ? null : (Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : null),
      votes: Number(raw.votes) || 0, url: raw.url || (imdbId ? `https://www.imdb.com/title/${imdbId}/` : "https://www.imdb.com/chart/"),
      poster: posterRecord?.poster || local?.poster || "",
      posterSource: posterRecord?.source || (local?.poster ? "local-library" : ""),
      kind, localId: local?.id || ""
    };
  }

  async function loadChart(kind) {
    const response = await fetch(API[kind], { headers: { "Accept": "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`${kind} chart HTTP ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : (payload.data || payload.items || []);
    if (!Array.isArray(rows) || !rows.length) throw new Error(`${kind} chart has no data`);
    return {
      items: rows.slice(0, 100).map(item => makeItem(item, kind)),
      updatedAt: payload.updatedAt || payload.updated_at || "",
      source: payload.source || ""
    };
  }

  function cardHtml(item) {
    const saved = state.saved.has(item.id);
    const primary = item.titleZh || item.title;
    const secondary = item.titleZh ? item.title : (item.year ? `IMDb · ${item.year}` : "IMDb CHART");
    const score = item.rating == null ? "—" : item.rating.toFixed(1);
    const votes = item.votes ? item.votes.toLocaleString("en-US") : "—";
    const image = item.poster ? `<img src="${escapeHtml(item.poster)}" alt="${escapeHtml(primary)} 海報" loading="lazy">` : "";
    return `
      <article class="rank-poster-card" data-kind="${item.kind}">
        <div class="rank-poster-art ${item.poster ? "has-poster" : ""}">
          ${image}
          <div class="rank-poster-fallback"><span>CINE SCOPE · IMDb</span><b>${escapeHtml(primary)}</b><small>${escapeHtml(item.title)}</small></div>
          <span class="rank-position">#${item.rank}</span>
          <span class="rank-kind">${item.kind === "movie" ? "FILM" : "TV SERIES"}</span>
          <button class="rank-save ${saved ? "saved" : ""}" type="button" data-save="${escapeHtml(item.id)}" aria-label="${saved ? "取消收藏" : "加入榜單收藏"}" aria-pressed="${saved}" title="${saved ? "取消收藏" : "加入榜單收藏"}">${saved ? "★" : "☆"}</button>
          <div class="rank-score"><span>IMDb</span><b>${score}</b></div>
        </div>
        <div class="rank-poster-info">
          <h3>${escapeHtml(primary)}</h3>
          <p>${escapeHtml(secondary)}</p>
          <div><span>${escapeHtml(String(item.year || "年份未提供"))}</span><span>${votes} votes</span></div>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">IMDb 詳情 ↗</a>
        </div>
      </article>`;
  }

  function render() {
    const q = state.search.trim().toLowerCase();
    const items = [...(state.kind === "all" || state.kind === "movie" ? state.movie : []),
      ...(state.kind === "all" || state.kind === "tv" ? state.tv : [])]
      .filter(item => !q || [item.title, item.titleZh, item.year].join(" ").toLowerCase().includes(q))
      .sort((a, b) => a.kind === b.kind ? a.rank - b.rank : a.kind === "movie" ? -1 : 1);
    $("#rankPosterGrid").innerHTML = items.length ? items.map(cardHtml).join("") :
      '<div class="rank-loading">沒有符合條件的作品。請清除搜尋或切換類型。</div>';
    const allItems = [...state.movie, ...state.tv];
    const posterCount = allItems.filter(item => Boolean(item.poster)).length;
    const posterTotal = allItems.length;
    $("#rankStatus").textContent = `顯示 ${items.length} 部作品 · 電影 ${state.movie.length} 部 · 劇集 ${state.tv.length} 部 · 海報 ${posterCount}/${posterTotal}`;
    const generatedAt = state.posterManifestMeta.generatedAt ? new Date(state.posterManifestMeta.generatedAt).toLocaleDateString("zh-HK") : "";
    $("#rankPaginationNote").textContent = posterCount < posterTotal
      ? `IMDb 電影及劇集各顯示前 100 名。已有 ${posterCount} 張真實海報；其餘作品會保留清晰的文字備用封面。設定 TMDb API 金鑰並執行 GitHub Actions，可補齊海報。`
      : `IMDb 電影及劇集各顯示前 100 名 · 海報資料更新：${generatedAt || "本地片庫"} · 點擊 IMDb 詳情核對排名。`;
    $("#imdbMovieCount").textContent = state.movie.length ? String(state.movie.length) : "—";
    $("#imdbTvCount").textContent = state.tv.length ? String(state.tv.length) : "—";
    $("#rankPosterGrid").querySelectorAll("img").forEach(img => {
      img.addEventListener("error", () => {
        const art = img.closest(".rank-poster-art");
        if (art) art.classList.remove("has-poster");
        img.remove();
      }, { once: true });
    });
  }

  function syncSaveButtons(id) {
    const saved = state.saved.has(id);
    document.querySelectorAll("[data-save]").forEach(button => {
      if (button.dataset.save !== id) return;
      button.classList.toggle("saved", saved);
      button.textContent = saved ? "★" : "☆";
      button.setAttribute("aria-pressed", String(saved));
      button.setAttribute("aria-label", saved ? "取消收藏" : "加入榜單收藏");
    });
  }

  async function init() {
    loadSaved();
    const [localResult, posterResult] = await Promise.allSettled([
      fetch("./data/movies.json", { cache: "no-cache" }),
      fetch("./data/ranking-posters.json", { cache: "no-cache" })
    ]);
    if (localResult.status === "fulfilled" && localResult.value.ok) {
      try {
        const data = await localResult.value.json();
        state.localMovies = Array.isArray(data.movies) ? data.movies : [];
      } catch (_) {}
    }
    if (posterResult.status === "fulfilled" && posterResult.value.ok) {
      try {
        const data = await posterResult.value.json();
        state.posterManifest = data.posters && typeof data.posters === "object" ? data.posters : {};
        state.posterManifestMeta = data;
      } catch (_) {}
    }
    const results = await Promise.allSettled([loadChart("movie"), loadChart("tv")]);
    const errors = [];
    if (results[0].status === "fulfilled") state.movie = results[0].value.items;
    else errors.push("電影榜暫時無法載入");
    if (results[1].status === "fulfilled") state.tv = results[1].value.items;
    else errors.push("劇集榜暫時無法載入");
    render();
    if (errors.length) {
      $("#rankStatus").textContent = errors.join("；") + "。可先使用上方官方榜單入口。";
    }
  }

  $("#rankSearch").addEventListener("input", event => { state.search = event.target.value; render(); });
  document.querySelector(".rank-filters").addEventListener("click", event => {
    const button = event.target.closest("[data-kind]");
    if (!button) return;
    state.kind = button.dataset.kind;
    document.querySelectorAll(".rank-filter").forEach(item => item.classList.toggle("active", item === button));
    render();
  });
  $("#rankPosterGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-save]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const id = button.dataset.save;
    if (state.saved.has(id)) {
      state.saved.delete(id);
      showToast("已從榜單收藏移除");
    } else {
      state.saved.add(id);
      showToast("已加入榜單收藏");
    }
    saveSaved();
    syncSaveButtons(id);
  });

  init();
})();