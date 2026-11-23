(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const state = {
    movies: [],
    type: "all",
    genre: "all",
    search: "",
    watchOnly: false,
    watchlist: new Set()
  };
  const WATCH_KEY = "cinescope-watchlist-v1";
  const grid = $("#movieGrid");
  const modal = $("#modalBackdrop");
  const modalContent = $("#modalContent");
  let toastTimer;

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);

  const numericScore = value => typeof value === "number" && Number.isFinite(value) ? value : -1;
  const percentText = value => value == null ? "—" : `${value}%`;
  const tenPointText = value => value == null ? "—" : value.toFixed(1);

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  function loadWatchlist() {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      state.watchlist = new Set(Array.isArray(saved) ? saved : []);
    } catch (_) {
      state.watchlist = new Set();
    }
    updateWatchCount();
  }

  function saveWatchlist() {
    localStorage.setItem(WATCH_KEY, JSON.stringify([...state.watchlist]));
    updateWatchCount();
  }

  function updateWatchCount() {
    $("#watchCount").textContent = state.watchlist.size;
  }

  function ratingChip(label, value, kind, suffix = "") {
    return `<div class="rating-chip ${kind}"><small>${label}</small><b>${value}<span class="unit">${suffix}</span></b></div>`;
  }

  function sourceLink(url, label) {
    if (!url) return '<small class="secondary-score">目前沒有可核實的頁面</small>';
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  }

  function render() {
    const query = state.search.trim().toLocaleLowerCase();
    let movies = state.movies.filter(movie => {
      const matchesType = state.type === "all" || (movie.type || "movie") === state.type;
      const genres = Array.isArray(movie.genres) ? movie.genres : [];
      const matchesGenre = state.genre === "all" || genres.includes(state.genre);
      const matchesSearch = !query || [
        movie.titleZh, movie.titleEn, movie.director, movie.country, ...genres
      ].join(" ").toLocaleLowerCase().includes(query);
      const matchesWatch = !state.watchOnly || state.watchlist.has(movie.id);
      return matchesType && matchesGenre && matchesSearch && matchesWatch;
    });

    const sort = $("#sortSelect").value;
    const sorters = {
      douban: (a, b) => numericScore(b.ratings?.douban) - numericScore(a.ratings?.douban),
      imdb: (a, b) => numericScore(b.ratings?.imdb) - numericScore(a.ratings?.imdb),
      tomato: (a, b) => numericScore(b.ratings?.tomato) - numericScore(a.ratings?.tomato),
      year: (a, b) => b.year - a.year,
      featured: (a, b) => state.movies.indexOf(a) - state.movies.indexOf(b)
    };
    movies.sort(sorters[sort] || sorters.featured);

    $("#resultCount").textContent = `顯示 ${movies.length} 部作品`;
    $("#emptyState").hidden = movies.length !== 0;
    grid.hidden = movies.length === 0;
    grid.innerHTML = movies.map((movie, index) => {
      const saved = state.watchlist.has(movie.id);
      const ratings = movie.ratings || {};
      const typeLabel = movie.type === "tv" ? "劇集" : "電影";
      const verified = [ratings.tomato, ratings.imdb, ratings.douban].filter(value => value != null).length;
      const genres = Array.isArray(movie.genres) ? movie.genres : [];
      return `
        <article class="movie-card" data-id="${escapeHtml(movie.id)}" style="animation-delay:${Math.min(index * 35, 240)}ms">
          <div class="poster-wrap">
            <img src="${escapeHtml(movie.poster || "")}" alt="${escapeHtml(movie.titleZh)} 海報" loading="lazy">
            <span class="poster-fallback">${escapeHtml(movie.titleEn)}</span>
            <div class="poster-top">
              <span class="poster-tag">${typeLabel}</span>
              <button class="save-btn ${saved ? "saved" : ""}" type="button" data-save="${escapeHtml(movie.id)}" aria-label="${saved ? "取消收藏" : "加入收藏"}">${saved ? "★" : "☆"}</button>
            </div>
            <div class="poster-bottom"><span class="year">${movie.year} · ${escapeHtml(movie.country)}</span><span class="watch-mark">VIEW DETAILS ↗</span></div>
          </div>
          <div class="movie-info">
            <div class="movie-title-row"><h3 class="movie-title">${escapeHtml(movie.titleZh)}</h3></div>
            <p class="movie-original">${escapeHtml(movie.titleEn)}</p>
            <p class="movie-genre">${escapeHtml(genres.join(" · "))}　/　${escapeHtml(movie.director)}</p>
            <div class="rating-row">
              ${ratingChip("RT 影評人", percentText(ratings.tomato), "tomato")}
              ${ratingChip("IMDb", tenPointText(ratings.imdb), "imdb", ratings.imdb == null ? "" : "/10")}
              ${ratingChip("豆瓣", tenPointText(ratings.douban), "douban", ratings.douban == null ? "" : "/10")}
            </div>
            <div class="card-footer"><span>${verified}/3 平台評分已收錄</span><span class="detail-link">查看詳情 →</span></div>
          </div>
        </article>`;
    }).join("");

    grid.querySelectorAll("img").forEach(img => {
      img.addEventListener("error", () => {
        const wrap = img.closest(".poster-wrap");
        if (wrap) wrap.classList.add("poster-failed");
        img.remove();
      }, { once: true });
    });
  }

  function openMovie(id) {
    const movie = state.movies.find(item => item.id === id);
    if (!movie) return;
    const saved = state.watchlist.has(movie.id);
    const ratings = movie.ratings || {};
    const typeLabel = movie.type === "tv" ? "劇集" : "電影";
    const genres = Array.isArray(movie.genres) ? movie.genres : [];
    modalContent.innerHTML = `
      <div class="detail-layout">
        <div>
          <img class="detail-poster" src="${escapeHtml(movie.poster || "")}" alt="${escapeHtml(movie.titleZh)} 海報">
        </div>
        <div>
          <p class="detail-eyebrow">CINESCOPE ${typeLabel} FILE · ${movie.year}</p>
          <h2 class="detail-title" id="modalTitle">${escapeHtml(movie.titleZh)}</h2>
          <p class="detail-original">${escapeHtml(movie.titleEn)}</p>
          <p class="detail-meta">${escapeHtml(movie.country)}　·　${escapeHtml(movie.runtime)}<br>導演／主創：${escapeHtml(movie.director)}<br>類型：${escapeHtml(genres.join("、"))}</p>
          <p class="detail-overview">${escapeHtml(movie.summary)}</p>
          <div class="detail-ratings">
            <div class="detail-rating">
              <small>🍅 RT 影評人</small>
              <b style="color:#ff9581">${percentText(ratings.tomato)}</b>
              <small class="secondary-score">觀眾 Popcornmeter：${percentText(ratings.popcorn)}</small>
              ${sourceLink(movie.links?.tomato, "查看爛番茄")}
            </div>
            <div class="detail-rating">
              <small>IMDb 全球觀眾</small>
              <b style="color:#f2ca78">${tenPointText(ratings.imdb)}${ratings.imdb == null ? "" : '<span style="font-size:10px;color:#8794a8"> /10</span>'}</b>
              ${sourceLink(movie.links?.imdb, "查看 IMDb")}
            </div>
            <div class="detail-rating">
              <small>豆瓣觀眾</small>
              <b style="color:#8ed5ad">${tenPointText(ratings.douban)}${ratings.douban == null ? "" : '<span style="font-size:10px;color:#8794a8"> /10</span>'}</b>
              ${sourceLink(movie.links?.douban, ratings.douban == null ? "到豆瓣核對" : "查看豆瓣")}
            </div>
          </div>
          <div class="detail-actions">
            <button class="save-detail" type="button" data-save="${escapeHtml(movie.id)}">${saved ? "★ 已加入我的片單" : "☆ 加入我的片單"}</button>
            ${sourceLink(movie.posterSource, "海報來源")}
          </div>
        </div>
      </div>
      <p class="source-note">評分資料快照：2026-11-23。部分平台未能核實的分數以「—」顯示，不用估算值補上。劇集的 Rotten Tomatoes 分數為系列整體平均，不代表某一季。本網站為個人影視整理介面，並非 Rotten Tomatoes、IMDb 或豆瓣的官方產品；海報版權歸原權利人所有。</p>`;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    $("#modalClose").focus();
    const image = $(".detail-poster", modalContent);
    image.addEventListener("error", () => { image.style.visibility = "hidden"; }, { once: true });
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function toggleSave(id) {
    if (state.watchlist.has(id)) {
      state.watchlist.delete(id);
      showToast("已從我的片單移除");
    } else {
      state.watchlist.add(id);
      showToast("已加入我的片單");
    }
    saveWatchlist();
    render();
    if (!modal.hidden) openMovie(id);
  }

  function setWatchOnly(enabled) {
    state.watchOnly = enabled;
    $("#watchOnlyBtn").classList.toggle("active", enabled);
    $("#watchOnlyBtn").textContent = enabled ? "✓ 正在查看收藏" : "♡ 只看收藏";
    render();
  }

  function updateCounts() {
    const movieCount = state.movies.filter(item => (item.type || "movie") === "movie").length;
    const seriesCount = state.movies.filter(item => item.type === "tv").length;
    $("#movieTotal").textContent = String(state.movies.length).padStart(2, "0");
    $("#filmTotal").textContent = String(movieCount).padStart(2, "0");
    $("#seriesTotal").textContent = String(seriesCount).padStart(2, "0");
    $("#allCount").textContent = String(state.movies.length).padStart(2, "0");
    $("#filmCount").textContent = String(movieCount).padStart(2, "0");
    $("#seriesCount").textContent = String(seriesCount).padStart(2, "0");
  }

  function exportWatchlist() {
    const items = state.movies.filter(movie => state.watchlist.has(movie.id));
    const payload = {
      exportedAt: new Date().toISOString(),
      note: "CineScope 個人片單匯出；評分為公開頁面快照。",
      movies: items
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cinescope-watchlist.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast(`已匯出 ${items.length} 部收藏作品`);
  }

  async function init() {
    loadWatchlist();
    try {
      const response = await fetch("./data/movies.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("movies.json unavailable");
      const data = await response.json();
      state.movies = data.movies || [];
      updateCounts();
      render();
    } catch (_) {
      grid.innerHTML = '<div class="loading-card">片單載入失敗。請重新整理頁面，或確認 data/movies.json 已上傳。</div>';
      $("#resultCount").textContent = "暫時無法載入";
    }
  }

  grid.addEventListener("click", event => {
    const saveButton = event.target.closest("[data-save]");
    if (saveButton) {
      event.stopPropagation();
      toggleSave(saveButton.dataset.save);
      return;
    }
    const card = event.target.closest("[data-id]");
    if (card) openMovie(card.dataset.id);
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
    const saveButton = event.target.closest("[data-save]");
    if (saveButton) toggleSave(saveButton.dataset.save);
  });

  $("#modalClose").addEventListener("click", closeModal);
  $("#searchInput").addEventListener("input", event => { state.search = event.target.value; render(); });
  $("#sortSelect").addEventListener("change", render);
  $("#watchOnlyBtn").addEventListener("click", () => setWatchOnly(!state.watchOnly));
  $("#watchlistNav").addEventListener("click", () => setWatchOnly(true));
  $("#showWatchlist").addEventListener("click", () => { setWatchOnly(true); $("#catalog").scrollIntoView({ behavior: "smooth" }); });
  $("#exportBtn").addEventListener("click", exportWatchlist);
  $("#themeInfo").addEventListener("click", () => showToast("評分為 2026-11-23 查閱快照；未核實的分數會顯示「—」。"));

  $("#resetFilters").addEventListener("click", () => {
    state.type = "all";
    state.genre = "all";
    state.search = "";
    $("#searchInput").value = "";
    state.watchOnly = false;
    $("#watchOnlyBtn").classList.remove("active");
    $("#watchOnlyBtn").textContent = "♡ 只看收藏";
    $("#typeFilters .type-pill").forEach(button => button.classList.toggle("selected", button.dataset.type === "all"));
    $("#genreFilters .genre-pill").forEach(button => button.classList.toggle("selected", button.dataset.genre === "all"));
    render();
  });

  $("#typeFilters").addEventListener("click", event => {
    const button = event.target.closest("[data-type]");
    if (!button) return;
    state.type = button.dataset.type;
    $("#typeFilters .type-pill").forEach(item => item.classList.toggle("selected", item === button));
    render();
  });

  $("#genreFilters").addEventListener("click", event => {
    const button = event.target.closest("[data-genre]");
    if (!button) return;
    state.genre = button.dataset.genre;
    $("#genreFilters .genre-pill").forEach(item => item.classList.toggle("selected", item === button));
    render();
  });

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("#searchInput").focus();
    }
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  init();
})();