(function () {
  "use strict";

  function normalizePath(value) {
    var str = String(value || "").replace(/\\/g, "/").trim();
    str = str.replace(/^\.\//, "").replace(/^\/+/, "");
    var parts = str.split("/");
    var stack = [];
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i];
      if (!part || part === ".") continue;
      if (part === "..") {
        if (stack.length) stack.pop();
        continue;
      }
      stack.push(part);
    }
    return stack.join("/");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function stripMarkdown(markdown) {
    return String(markdown || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/!\[[^\]]*\]\(([^)]+)\)/g, " ")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, " $1 ")
      .replace(/[`*_>#-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  function buildSnippet(text, tokens) {
    if (!text) return "";
    var lower = text.toLowerCase();
    var idx = -1;
    for (var i = 0; i < tokens.length; i += 1) {
      var pos = lower.indexOf(tokens[i]);
      if (pos !== -1 && (idx === -1 || pos < idx)) idx = pos;
    }
    if (idx === -1) return text.slice(0, 180) + (text.length > 180 ? "..." : "");
    var start = Math.max(0, idx - 70);
    var end = Math.min(text.length, idx + 150);
    var snip = text.slice(start, end).trim();
    if (start > 0) snip = "..." + snip;
    if (end < text.length) snip += "...";
    return snip;
  }

  function scoreDoc(doc, query, tokens) {
    var title = doc.title.toLowerCase();
    var body = doc.body.toLowerCase();
    var score = 0;
    if (title.indexOf(query) !== -1) score += 80;
    if (body.indexOf(query) !== -1) score += 28;
    for (var i = 0; i < tokens.length; i += 1) {
      var t = tokens[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var titleHits = (title.match(new RegExp(t, "g")) || []).length;
      var bodyHits = (body.match(new RegExp(t, "g")) || []).length;
      score += (titleHits * 24) + (bodyHits * 4);
    }
    if (doc.kind === "section" && body.indexOf(query) !== -1) score += 12;
    return score;
  }

  function isMatch(doc, query, tokens) {
    var hay = (doc.title + " " + doc.body).toLowerCase();
    if (hay.indexOf(query) !== -1) return true;
    for (var i = 0; i < tokens.length; i += 1) {
      if (hay.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  function isGitHubPages() {
    return /\.github\.io$/i.test(window.location.hostname);
  }

  function humanizeFile(file) {
    return String(file || "")
      .replace(/\.md$/i, "")
      .split("/")
      .pop()
      .replace(/[-_]+/g, " ")
      .trim();
  }

  function folderFromFile(file) {
    var normalized = normalizePath(file);
    var idx = normalized.lastIndexOf("/");
    return idx >= 0 ? normalized.slice(0, idx) : "";
  }

  async function loadManifestFromGitHub() {
    var owner = window.location.hostname.split(".")[0];
    var pathParts = window.location.pathname.split("/").filter(Boolean);
    var repo = pathParts.length && !/\.html?$/i.test(pathParts[0]) ? pathParts[0] : owner + ".github.io";
    var base = "https://api.github.com/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo);

    var repoRes = await fetch(base, { headers: { Accept: "application/vnd.github+json" } });
    if (!repoRes.ok) throw new Error("GitHub repo lookup failed");
    var meta = await repoRes.json();

    var treeRes = await fetch(base + "/git/trees/" + encodeURIComponent(meta.default_branch || "main") + "?recursive=1", {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!treeRes.ok) throw new Error("GitHub tree lookup failed");

    var treePayload = await treeRes.json();
    var prefix = "wiki/content/";
    var pages = (treePayload.tree || [])
      .filter(function (entry) {
        return entry && entry.type === "blob" && typeof entry.path === "string" && entry.path.indexOf(prefix) === 0 && /\.md$/i.test(entry.path);
      })
      .map(function (entry) {
        var file = normalizePath(entry.path.slice(prefix.length));
        return { file: file, title: humanizeFile(file), folder: folderFromFile(file) };
      })
      .sort(function (a, b) { return a.file.localeCompare(b.file, undefined, { sensitivity: "base" }); });

    return { title: "RSTools Wiki", generatedAt: new Date().toISOString(), pages: pages };
  }

  async function loadManifest() {
    if (isGitHubPages()) {
      try {
        var remote = await loadManifestFromGitHub();
        if (remote && remote.pages && remote.pages.length) return remote;
      } catch (err) {
        console.warn("GitHub manifest load failed", err);
      }
    }

    try {
      var response = await fetch("wiki/data/content-manifest.json?v=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("manifest load failed");
      return await response.json();
    } catch (err2) {
      if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.manifest) return window.WIKI_FALLBACK.manifest;
      throw err2;
    }
  }

  async function loadMarkdown(file) {
    var encoded = normalizePath(file).split("/").map(encodeURIComponent).join("/");
    try {
      var res = await fetch("wiki/content/" + encoded + "?v=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("markdown fetch failed");
      return await res.text();
    } catch (err) {
      var fallbackPages = window.WIKI_FALLBACK && window.WIKI_FALLBACK.pages;
      if (fallbackPages && typeof fallbackPages[file] === "string") return fallbackPages[file];
      throw err;
    }
  }

  function splitSections(markdown) {
    var lines = String(markdown || "").replace(/\r/g, "").split("\n");
    var sections = [];
    var title = "Overview";
    var buf = [];
    for (var i = 0; i < lines.length; i += 1) {
      var m = /^(#{1,3})\s+(.+)$/.exec(lines[i].trim());
      if (m) {
        if (buf.length) sections.push({ heading: title, body: buf.join("\n") });
        title = m[2].trim();
        buf = [];
      } else {
        buf.push(lines[i]);
      }
    }
    if (buf.length) sections.push({ heading: title, body: buf.join("\n") });
    return sections;
  }

  function slugify(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-") || "section";
  }

  async function buildCorpus() {
    var corpus = [
      { kind: "tool", title: "Home", body: "Interwell tools home page", url: "index.html", displayUrl: "index.html" },
      { kind: "tool", title: "Barrier Sealing Length Calculator", body: "bslc barrier sealing calculator", url: "bslc.html", displayUrl: "bslc.html" },
      { kind: "tool", title: "Image Annotating Tool", body: "iat image annotating tool", url: "iat.html", displayUrl: "iat.html" },
      { kind: "tool", title: "Pressure Converter", body: "pressure converter psi bar mpa", url: "pressure-converter.html", displayUrl: "pressure-converter.html" },
      { kind: "tool", title: "Time Converter", body: "time converter world clocks timezone", url: "time-converter.html", displayUrl: "time-converter.html" },
      { kind: "tool", title: "Well Architecture Plotter", body: "wap well architecture plotter", url: "wap.html", displayUrl: "wap.html" },
      { kind: "tool", title: "Wiki", body: "wiki documentation workflows tools", url: "wiki.html", displayUrl: "wiki.html" }
    ];

    var manifest = await loadManifest();
    var pages = Array.isArray(manifest.pages) ? manifest.pages : [];

    for (var i = 0; i < pages.length; i += 1) {
      var page = pages[i];
      var file = normalizePath(page.file || "");
      if (!file) continue;
      var md = await loadMarkdown(file);
      var plain = stripMarkdown(md);
      var title = String(page.title || "").trim() || humanizeFile(file);
      var folder = folderFromFile(file);

      corpus.push({
        kind: "page",
        title: title,
        body: plain + " " + folder.replace(/\//g, " "),
        url: "wiki.html?page=" + encodeURIComponent(file),
        displayUrl: "wiki.html?page=" + file
      });

      var sections = splitSections(md);
      for (var s = 0; s < sections.length; s += 1) {
        var sec = sections[s];
        var secBody = stripMarkdown(sec.body);
        if (!secBody) continue;
        var hash = slugify(sec.heading);
        corpus.push({
          kind: "section",
          title: title + " - " + sec.heading,
          body: secBody + " " + folder.replace(/\//g, " "),
          url: "wiki.html?page=" + encodeURIComponent(file) + "#" + encodeURIComponent(hash),
          displayUrl: "wiki.html?page=" + file + "#" + hash
        });
      }
    }

    return corpus;
  }

  function renderResults(results, query) {
    var summary = document.getElementById("search-summary");
    var list = document.getElementById("search-results");
    if (!summary || !list) return;

    if (!query) {
      summary.textContent = "Type a search term and press Enter.";
      list.innerHTML = "";
      return;
    }

    summary.textContent = results.length + " result" + (results.length === 1 ? "" : "s") + ' for "' + query + '"';

    if (!results.length) {
      list.innerHTML = '<p class="search-empty">No matches found.</p>';
      return;
    }

    function withHitQuery(url, q) {
      if (!q || url.indexOf("wiki.html") !== 0) return url;
      var hashIndex = url.indexOf("#");
      var hash = hashIndex === -1 ? "" : url.slice(hashIndex);
      var base = hashIndex === -1 ? url : url.slice(0, hashIndex);
      var sep = base.indexOf("?") === -1 ? "?" : "&";
      return base + sep + "hit=" + encodeURIComponent(q) + hash;
    }

    list.innerHTML = results.slice(0, 30).map(function (result) {
      var target = withHitQuery(result.url, query);
      return '' +
        '<article class="search-result">' +
          '<a class="search-result-url" href="' + target + '">' + escapeHtml(result.displayUrl) + '</a>' +
          '<h2 class="search-result-title"><a href="' + target + '">' + escapeHtml(result.title) + '</a></h2>' +
          '<p class="search-result-snippet">' + escapeHtml(result.snippet) + '</p>' +
        '</article>';
    }).join("");
  }

  async function runSearch() {
    var params = new URLSearchParams(window.location.search || "");
    var query = String(params.get("q") || "").trim();
    var qLower = query.toLowerCase();
    var tokens = tokenize(qLower);

    var input = document.querySelector('.app-meta .search-input') || document.getElementById("searchInput");
    if (input) input.value = query;

    if (!tokens.length) {
      renderResults([], "");
      return;
    }

    var corpus = await buildCorpus();
    var ranked = corpus
      .map(function (doc) {
        return {
          title: doc.title,
          url: doc.url,
          displayUrl: doc.displayUrl,
          snippet: buildSnippet(doc.body, tokens),
          score: scoreDoc(doc, qLower, tokens),
          matched: isMatch(doc, qLower, tokens)
        };
      })
      .filter(function (doc) { return doc.matched && doc.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    renderResults(ranked, query);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runSearch);
  } else {
    runSearch();
  }
})();
