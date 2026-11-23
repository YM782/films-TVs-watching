(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const state = { movies: [], genre: "all", search: "", watchOnly: false, watchlist: new Set() };
  const WATCH_KEY = "cinescope-watchlist-v1";
  const grid = $("#movieGrid");
  const modal = $("#modalBackdrop");
  const modalContent = $("#modalContent");
  let toastTimer;

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);

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
    } catch (_) { state.watchlist = new Set(); }
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

  function render() {
    const query = state.search.trim().toLocaleLowerCase();
    let movies = state.movies.filter(movie => {
      const matchesGenre = state.genre === "all" || movie.genres.includes(state.genre);
      const matchesSearch = !query || [movie.titleZh, movie.titleEn, movie.director, movie.country, ...movie.genres]
        .join(" ").toLocaleLowerCase().includes(query);
      const matchesWatch = !state.watchOnly || state.watchlist.has(movie.id);
      return matchesGenre && matchesSearch && matchesWatch;
    });

    const sort = $("#sortSelect").value;
    const sorters = {
      douban: (a, b) => b.ratings.douban - a.ratings.douban,
      imdb: (a, b) => b.ratings.imdb - a.ratings.imdb,
      tomato: (a, b) => b.ratings.tomato - a.ratings.tomato,
      year: (a, b) => b.year - a.year,
      featured: (a, b) => state.movies.indexOf(a) - state.movies.indexOf(b)
    };
    movies.sort(sorters[sort] || sorters.featured);

    $("#resultCount").textContent = `顯示 ${movies.length} 部作品`;
    $("#emptyState").hidden = movies.length !== 0;
    grid.hidden = movies.length === 0;
    grid.innerHTML = movies.map((movie, index) => {
      const saved = state.watchlist.has(movie.id);
      return `
        <article class="movie-card" data-id="${escapeHtml(movie.id)}" style="animation-delay:${Math.min(index * 45, 260)}ms">
          <div class="poster-wrap">
            <img src="${escapeHtml(movie.poster)}" alt="${escapeHtml(movie.titleZh)} 電影海報" loading="lazy">
            <span class="poster-fallback">${escapeHtml(movie.titleEn)}</span>
            <div class="poster-top">
              <span class="poster-tag">${escapeHtml(movie.genres[0] || "電影")}</span>
              <button class="save-btn ${saved ? "saved" : ""}" type="button" data-save="${escapeHtml(movie.id)}" aria-label="${saved ? "取消收藏" : "加入收藏"}">${saved ? "★" : "☆"}</button>
            </div>
            <div class="poster-bottom"><span class="year">${movie.year} · ${escapeHtml(movie.country)}</span><span class="watch-mark">VIEW DETAILS ↗</span></div>
          </div>
          <div class="movie-info">
            <div class="movie-title-row"><h3 class="movie-title">${escapeHtml(movie.titleZh)}</h3></div>
            <p class="movie-original">${escapeHtml(movie.titleEn)}</p>
            <p class="movie-genre">${escapeHtml(movie.genres.join(" · "))}　/　${escapeHtml(movie.director)}</p>
            <div class="rating-row">
              ${ratingChip("RT 影評人", movie.ratings.tomato + "%", "tomato")}
              ${ratingChip("IMDb", movie.ratings.imdb.toFixed(1), "imdb", "/10")}
              ${ratingChip("豆瓣", movie.ratings.douban.toFixed(1), "douban", "/10")}
            </div>
            <div class="card-footer"><span>三站評分對照</span><span class="detail-link">查看詳情 →</span></div>
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
    modalContent.innerHTML = `
      <div class="detail-layout">
        <div>
          <img class="detail-poster" src="${escapeHtml(movie.poster)}" alt="${escapeHtml(movie.titleZh)} 海報">
        </div>
        <div>
          <p class="detail-eyebrow">CINESCOPE FILM FILE · ${movie.year}</p>
          <h2 class="detail-title" id="modalTitle">${escapeHtml(movie.titleZh)}</h2>
          <p class="detail-original">${escapeHtml(movie.titleEn)}</p>
          <p class="detail-meta">${escapeHtml(movie.country)}　·　${escapeHtml(movie.runtime)}<br>導演：${escapeHtml(movie.director)}<br>類型：${escapeHtml(movie.genres.join("、"))}</p>
          <p class="detail-overview">${escapeHtml(movie.summary)}</p>
          <div class="detail-ratings">
            <div class="detail-rating"><small>🍅 RT 影評人</small><b style="color:#ff9581">${movie.ratings.tomato}%</b><a href="${escapeHtml(movie.links.tomato)}" target="_blank" rel="noopener">查看烂番茄 ↗</a></div>
            <div class="detail-rating"><small>IMDb 全球觀眾</small><b style="color:#f2ca78">${movie.ratings.imdb.toFixed(1)}<span style="font-size:10px;color:#8794a8"> /10</span></b><a href="${escapeHtml(movie.links.imdb)}" target="_blank" rel="noopener">查看 IMDb ↗</a></div>
            <div class="detail-rating"><small>豆瓣觀眾</small><b style="color:#8ed5ad">${movie.ratings.douban.toFixed(1)}<span style="font-size:10px;color:#8794a8"> /10</span></b><a href="${escapeHtml(movie.links.douban)}" target="_blank" rel="noopener">查看豆瓣 ↗</a></div>
          </div>
          <div class="detail-actions">
            <button class="save-detail" type="button" data-save="${escapeHtml(movie.id)}">${saved ? "★ 已加入我的片單" : "☆ 加入我的片單"}</button>
            <a href="${escapeHtml(movie.posterSource)}" target="_blank" rel="noopener">海報來源 ↗</a>
          </div>
        </div>
      </div>
      <p class="source-note">評分資料快照：2026-11-23。分數會隨各平台更新；本網站為個人影視收藏介面，並非 Rotten Tomatoes、IMDb 或豆瓣的官方產品。海報版權歸原權利人所有，圖片由外部來源載入。</p>`;
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

  function exportWatchlist() {
    const items = state.movies.filter(movie => state.watchlist.has(movie.id));
    const payload = {
      exportedAt: new Date().toISOString(),
      note: "CineScope 個人片單匯出。評分為建立網站時的快照。",
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
      $("#movieTotal").textContent = String(state.movies.length).padStart(2, "0");
      const allPill = $('.genre-pill[data-genre="all"]');
      if (allPill) allPill.innerHTML = `全部作品 <span>${String(state.movies.length).padStart(2, "0")}</span>`;
      render();
    } catch (error) {
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
  $("#themeInfo").addEventListener("click", () => showToast("評分為 2026-11-23 查閱快照；點擊電影卡片可開啟三站原始頁面。"));
  $("#resetFilters").addEventListener("click", () => {
    state.genre = "all"; state.search = ""; setWatchOnly(false);
    $("#searchInput").value = "";
    $("#genreFilters .genre-pill").forEach(button => button.classList.toggle("selected", button.dataset.genre === "all"));
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
      event.preventDefault(); $("#searchInput").focus();
    }
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  init();
})();