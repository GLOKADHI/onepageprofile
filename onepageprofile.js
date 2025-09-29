(function () {
  "use strict";

  /* ---------------------------
     Config
  ----------------------------*/
  const RESUME_CONFIG = {
    filename: "Lok_Adhithya_G_Resume.pdf",
    path: "downloads/Lok_Adhithya_G_Resume.pdf",
    downloadDelay: 1200
  };

  const GITHUB_CONFIG = {
    username: "GLOKADHI",
    apiUrl: "https://api.github.com/users/GLOKADHI/repos?per_page=100&sort=pushed",
    pageUrl: "https://github.com/GLOKADHI?tab=repositories",
    maxRepos: 8,
    apiTimeoutMs: 2200,
    overallTimeoutMs: 5000,
    cacheKey: "gh_repos_cache_v1",
    cacheTtlMs: 1000 * 60 * 60 * 6 // 6 hours
  };

  const FALLBACK_IMAGE = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect width="100%" height="100%" fill="#f2f4f8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6c7a89" font-family="Arial" font-size="20">Image unavailable</text></svg>`
  );

  /* ---------------------------
     Utilities
  ----------------------------*/
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function fetchWithTimeout(url, opts = {}, timeout = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    return fetch(url, Object.assign({}, opts, { signal: controller.signal }))
      .finally(() => clearTimeout(id));
  }

  function escapeHtml(s = "") {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function formatNumber(n) {
    if (!Number.isFinite(n)) return "0";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return String(n);
  }

  function getLanguageColor(lang) {
    const map = { 'JavaScript': '#f1e05a', 'Python': '#3572A5', 'Java': '#b07219', 'TypeScript': '#2b7489' };
    return map[lang] || '#6c7a89';
  }

  /* ---------------------------
     Image fallback (keeps prior behavior)
  ----------------------------*/
  function applyImageStyling(img) {
    img.style.objectFit = "cover";
    img.style.display = "block";
  }

  function attachFallbackToImage(img) {
    if (!img) return;
    const source = img.getAttribute("src") || "";
    img.dataset.initialSrc = source;
    img.addEventListener("error", () => {
      img.src = FALLBACK_IMAGE;
      img.classList.add("image-placeholder");
      showToast(`Could not load: ${source}`, "warn");
    });
    img.addEventListener("load", () => {
      img.classList.remove("image-placeholder");
      applyImageStyling(img);
    });
  }

  function setupImages() {
    document.querySelectorAll("img[data-placeholder]").forEach(attachFallbackToImage);
  }

  /* ---------------------------
     Toast
  ----------------------------*/
  function showToast(message, kind = "info") {
    const colors = { success: "#27ae60", warn: "#f39c12", error: "#e74c3c", info: "#3498db" };
    let toast = document.getElementById("toast-banner");
    if (!toast) {
      toast = document.createElement("div"); toast.id = "toast-banner";
      toast.style = "position:fixed;right:18px;bottom:18px;padding:12px 16px;border-radius:10px;color:#fff;z-index:9999;font-family:Arial, sans-serif;transform:translateX(110%);transition:all .35s";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = colors[kind] || colors.info;
    requestAnimationFrame(() => toast.style.transform = "translateX(0)");
    clearTimeout(toast.dataset.tid);
    toast.dataset.tid = setTimeout(() => toast.style.transform = "translateX(110%)", 3800);
  }

  /* ---------------------------
     Resume download
  ----------------------------*/
  function openResumeInNewTab() {
    // Prefer opening in a new tab (works well on GitHub Pages)
    try {
      const win = window.open(RESUME_CONFIG.path, '_blank', 'noopener');
      if (win) {
        win.focus();
        showSuccessModal();
        showToast("Opening resume...", "success");
        return true;
      }
    } catch (e) { /* continue to fallback */ }
    return false;
  }

  function forceDownloadViaAnchor() {
    const a = document.createElement('a');
    a.href = RESUME_CONFIG.path;
    a.download = RESUME_CONFIG.filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    showSuccessModal();
    showToast("Resume download started.", "success");
  }

  function downloadResumeHandler(event) {
    const btn = event && event.currentTarget ? event.currentTarget : null;
    if (btn) {
      btn.classList.add('loading');
      btn.disabled = true;
    }

    // Delay to allow UI animation (if any)
    setTimeout(() => {
      const opened = openResumeInNewTab();
      if (!opened) {
        // fallback to anchor click
        forceDownloadViaAnchor();
      }
      if (btn) {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    }, RESUME_CONFIG.downloadDelay);
  }

  function setupResumeDownload() {
    // Attach to elements with exact IDs
    const ids = ['downloadResumeBtn', 'downloadResumeBtn2'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', downloadResumeHandler);
    });
    // Fallback: attach to any element whose id starts with 'downloadResumeBtn' (handles variants)
    document.querySelectorAll('[id^="downloadResumeBtn"]').forEach(btn => {
      if (!btn._resumeAttached) {
        btn.addEventListener('click', downloadResumeHandler);
        btn._resumeAttached = true;
      }
    });
  }

  function showSuccessModal() {
    const modal = document.getElementById('downloadSuccessModal'); if (!modal) return;
    modal.classList.add('show');
    setTimeout(() => modal.classList.remove('show'), 3000);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
  }

  /* ---------------------------
     Contact form
  ----------------------------*/
  async function submitContactForm(e) {
    e.preventDefault();
    const form = e.target; const btn = document.getElementById("submitBtn"); const status = document.getElementById("formStatus");
    const payload = { name: form.name?.value.trim() || "", email: form.email?.value.trim() || "", subject: form.subject?.value.trim() || "", message: form.message?.value.trim() || "" };
    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      if (status) { status.className = "form-status error"; status.textContent = "⚠️ Please fill in all fields."; status.style.display = "block"; }
      return;
    }
    try {
      if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }
      if (status) status.style.display = "none";
      // Simulate success; replace with actual network call if needed
      setTimeout(() => {
        if (status) { status.className = "form-status success"; status.textContent = "✅ Message sent successfully!"; status.style.display = "block"; }
        if (form) form.reset();
        showToast("Message sent successfully!", "success");
      }, 1000);
    } catch (err) {
      if (status) { status.className = "form-status error"; status.textContent = `❌ Error sending message.`; status.style.display = "block"; }
      showToast("Failed to send message.", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Send Message"; setTimeout(() => { if (status) status.style.display = "none"; }, 5000); }
    }
  }

  function setupContactForm() {
    const form = document.getElementById("contactForm");
    if (form) form.addEventListener("submit", submitContactForm);
  }

  /* ---------------------------
     Caching helpers
  ----------------------------*/
  function loadCachedRepos() {
    try {
      const raw = localStorage.getItem(GITHUB_CONFIG.cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.repos)) return null;
      const age = Date.now() - (parsed.ts || 0);
      return { repos: parsed.repos, ts: parsed.ts, age };
    } catch { return null; }
  }

  function saveCachedRepos(repos) {
    try {
      localStorage.setItem(GITHUB_CONFIG.cacheKey, JSON.stringify({ ts: Date.now(), repos }));
    } catch { }
  }

  /* ---------------------------
     Fetch strategies
  ----------------------------*/
  async function fetchViaApi(timeoutMs = GITHUB_CONFIG.apiTimeoutMs) {
    try {
      const resp = await fetchWithTimeout(GITHUB_CONFIG.apiUrl, { headers: { Accept: "application/vnd.github.v3+json" } }, timeoutMs);
      if (!resp || !resp.ok) return null;
      const data = await resp.json();
      if (!Array.isArray(data)) return null;
      return data
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
        .slice(0, GITHUB_CONFIG.maxRepos)
        .map(r => ({
          name: r.name,
          html_url: r.html_url,
          description: r.description,
          language: r.language,
          stargazers_count: r.stargazers_count || 0,
          forks_count: r.forks_count || 0,
          pushed_at: r.pushed_at,
          topics: Array.isArray(r.topics) ? r.topics : []
        }));
    } catch { return null; }
  }

  async function fetchViaHtmlPage(timeoutMs = 4000) {
    const proxyUrls = [
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://r.jina.ai/http://github.com${new URL(u).pathname}?tab=repositories`
    ];
    let html = null;
    for (const makeUrl of proxyUrls) {
      try {
        const resp = await fetchWithTimeout(makeUrl(GITHUB_CONFIG.pageUrl), {}, timeoutMs);
        if (!resp || !resp.ok) continue;
        html = await resp.text();
        if (html && html.length > 200) break;
      } catch { html = null; }
    }
    if (!html) return null;

    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const root = doc.querySelector("#user-repositories-list") || doc;
      const listItems = Array.from(root.querySelectorAll("li")).filter(li => li.querySelector("h3 a"));
      const repos = [];
      for (const li of listItems) {
        const a = li.querySelector("h3 a");
        const name = a ? a.textContent.trim() : null;
        const href = a ? (a.href || (a.getAttribute("href") ? "https://github.com" + a.getAttribute("href") : null)) : null;
        const descNode = li.querySelector("p") || li.querySelector('[itemprop="description"]');
        const description = descNode ? descNode.textContent.trim() : "";
        const langNode = li.querySelector('[itemprop="programmingLanguage"]') || li.querySelector('.f6 span[itemprop="programmingLanguage"]');
        const language = langNode ? langNode.textContent.trim() : "";
        const starA = Array.from(li.querySelectorAll("a")).find(x => x.getAttribute("href") && x.getAttribute("href").includes("/stargazers"));
        const forkA = Array.from(li.querySelectorAll("a")).find(x => x.getAttribute("href") && (x.getAttribute("href").includes("/network/members") || x.getAttribute("href").includes("/network")));
        const stars = starA ? parseInt((starA.textContent || "0").replace(/[^\d]/g, "")) || 0 : 0;
        const forks = forkA ? parseInt((forkA.textContent || "0").replace(/[^\d]/g, "")) || 0 : 0;
        const rel = li.querySelector("relative-time, time-ago, time");
        const pushed_at = rel ? (rel.getAttribute("datetime") || rel.textContent) : "";
        const topics = Array.from(li.querySelectorAll('.topic-tag, a.topic-tag, a[href*="/topics/"]')).map(t => t.textContent.trim()).filter(Boolean);

        if (name && href) {
          repos.push({ name, html_url: href, description, language, stargazers_count: stars, forks_count: forks, pushed_at, topics });
        }
        if (repos.length >= GITHUB_CONFIG.maxRepos) break;
      }
      return repos.length ? repos : null;
    } catch { return null; }
  }

  /* ---------------------------
     Render & UI helpers
  ----------------------------*/
  function setCacheBadge(ts) {
    const el = document.getElementById("cacheBadge");
    if (!el) return;
    if (!ts) { el.style.display = "none"; return; }
    const ageMs = Date.now() - ts;
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    el.style.display = "inline-block";
    el.textContent = hours === 0 ? "cached: just now" : `cached: ${hours}h ago`;
  }

  function showPortfolioLoading(show = true, short = false) {
    const loading = document.getElementById("portfolioLoading");
    const grid = document.getElementById("portfolioGrid");
    const err = document.getElementById("portfolioError");
    if (loading) loading.style.display = show ? "flex" : "none";
    if (grid) grid.style.display = show ? "none" : (grid.children.length ? "grid" : "none");
    if (err) err.style.display = "none";
  }

  function showPortfolioError() {
    const err = document.getElementById("portfolioError");
    const loading = document.getElementById("portfolioLoading");
    const grid = document.getElementById("portfolioGrid");
    if (err) err.style.display = "block";
    if (loading) loading.style.display = "none";
    if (grid) grid.style.display = "none";
  }

  function createProjectElement(repo) {
    const card = document.createElement("article"); card.className = "portfolio-item";
    const languageColor = getLanguageColor(repo.language);
    const name = escapeHtml(repo.name || "Unnamed");
    const url = repo.html_url || "#";
    const desc = escapeHtml(repo.description || "No description available.");
    const topicsHtml = (repo.topics && repo.topics.length) ? `<div class="project-topics">${repo.topics.slice(0, 5).map(t => `<span class="project-topic">${escapeHtml(t)}</span>`).join("")}</div>` : "";
    const stars = formatNumber(repo.stargazers_count || 0);
    const forks = formatNumber(repo.forks_count || 0);
    const updated = repo.pushed_at ? new Date(repo.pushed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "";
    const languageBadge = repo.language ? `<span class="project-language" style="background:${languageColor}">${escapeHtml(repo.language)}</span>` : "";

    card.innerHTML = `
      <div class="project-header">
        <div><h3 class="project-title"><a href="${url}" target="_blank" rel="noopener">${name}</a></h3></div>
        ${languageBadge}
      </div>
      <p class="project-description">${desc}</p>
      ${topicsHtml}
      <div class="project-stats">
        <div class="project-stat">⭐ ${stars}</div>
        <div class="project-stat">🍴 ${forks}</div>
        ${updated ? `<div class="project-stat">🕒 ${escapeHtml(updated)}</div>` : ""}
      </div>
    `;
    return card;
  }

  function renderRepos(repos, fromCache = false, ts = null) {
    const grid = document.getElementById("portfolioGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (!Array.isArray(repos) || repos.length === 0) {
      showPortfolioError(); return;
    }
    repos.slice(0, GITHUB_CONFIG.maxRepos).forEach(r => grid.appendChild(createProjectElement(r)));
    const loading = document.getElementById("portfolioLoading");
    const err = document.getElementById("portfolioError");
    if (loading) loading.style.display = "none";
    if (err) err.style.display = "none";
    grid.style.display = "grid";
    setCacheBadge(fromCache && ts ? ts : (Date.now()));
  }

  /* ---------------------------
     Orchestrator: use cache + parallel fetch, pick best
  ----------------------------*/
  async function fetchAndRenderRepos(forceRefresh = false) {
    const refreshBtn = document.getElementById("refreshReposBtn");
    if (refreshBtn) refreshBtn.classList.add("loading");
    const cache = loadCachedRepos();
    if (cache && !forceRefresh) {
      renderRepos(cache.repos, true, cache.ts);
      backgroundFetchAndUpdate();
      if (refreshBtn) refreshBtn.classList.remove("loading");
      return;
    }

    showPortfolioLoading(true);

    const apiP = fetchViaApi(GITHUB_CONFIG.apiTimeoutMs);
    const htmlP = fetchViaHtmlPage(3000);

    let repos = null;
    try {
      repos = await firstNonNull([apiP, htmlP], GITHUB_CONFIG.overallTimeoutMs);
    } catch (err) {
      repos = null;
    }

    if (repos && repos.length) {
      renderRepos(repos, false, Date.now());
      saveCachedRepos(repos);
    } else if (cache) {
      renderRepos(cache.repos, true, cache.ts);
      showToast("Using cached repositories (fresh fetch failed).", "warn");
    } else {
      showPortfolioError();
      showToast("Could not fetch GitHub repositories.", "error");
    }
    if (refreshBtn) refreshBtn.classList.remove("loading");
  }

  async function firstNonNull(promises, overallTimeoutMs) {
    const wrapped = promises.map(p => Promise.resolve(p).then(r => (Array.isArray(r) && r.length) ? r : null).catch(() => null));
    const timeoutP = new Promise(res => setTimeout(() => res(null), overallTimeoutMs));
    const results = await Promise.race([Promise.race(wrapped), timeoutP]);
    if (results) return results;
    const settled = await Promise.race([Promise.all(wrapped), timeoutP]);
    return Array.isArray(settled) ? settled.find(x => x && x.length) || null : null;
  }

  async function backgroundFetchAndUpdate() {
    try {
      const apiRes = await fetchViaApi(3500);
      if (apiRes && apiRes.length) {
        saveCachedRepos(apiRes);
        renderRepos(apiRes, false, Date.now());
        return;
      }
      const htmlRes = await fetchViaHtmlPage(4000);
      if (htmlRes && htmlRes.length) { saveCachedRepos(htmlRes); renderRepos(htmlRes, false, Date.now()); return; }
    } catch { }
  }

  /* ---------------------------
     Hook UI controls
  ----------------------------*/
  function setupRepoRefresh() {
    const btn = document.getElementById("refreshReposBtn");
    if (!btn) return;
    btn.addEventListener("click", () => { fetchAndRenderRepos(true); });
    const retry = document.getElementById("retryReposBtn");
    if (retry) retry.addEventListener("click", () => fetchAndRenderRepos(true));
  }

  /* ---------------------------
     Init
  ----------------------------*/
  document.addEventListener("DOMContentLoaded", () => {
    setupImages();
    setupContactForm();
    setupResumeDownload();
    setupRepoRefresh();
    fetchAndRenderRepos(false);
  });

})();
