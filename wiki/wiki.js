(function () {
  "use strict";

  var CONTENT_ROOT = "wiki/content";
  var MANIFEST_PATH = "wiki/data/content-manifest.json";

  var state = {
    manifest: null,
    pagesByFile: new Map(),
    pagesByFileLower: new Map(),
    currentPage: "",
    expandedNavFolders: new Set(),
    articleBaseHtml: "",
    matches: [],
    activeMatchIndex: -1
  };

  var navEl = document.getElementById("wiki-nav-tree");
  var articleEl = document.getElementById("wiki-article");
  var findInput = document.getElementById("wiki-find-input");
  var findPrevBtn = document.getElementById("wiki-find-prev");
  var findNextBtn = document.getElementById("wiki-find-next");
  var findCountEl = document.getElementById("wiki-find-count");
  var hasFindUi = Boolean(findInput && findPrevBtn && findNextBtn && findCountEl);

  function nowBust() {
    return "v=" + Date.now();
  }

  function normalizePath(value) {
    var str = String(value || "").replace(/\\/g, "/").trim();
    str = str.replace(/^\.\//, "");
    str = str.replace(/^\/+/, "");
    var parts = str.split("/");
    var stack = [];
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i];
      if (!part || part === ".") {
        continue;
      }
      if (part === "..") {
        if (stack.length > 0) {
          stack.pop();
        }
        continue;
      }
      stack.push(part);
    }
    return stack.join("/");
  }

  function encodePathForUrl(path) {
    return normalizePath(path)
      .split("/")
      .map(function (seg) { return encodeURIComponent(seg); })
      .join("/");
  }

  function folderFromFile(file) {
    var normalized = normalizePath(file);
    var idx = normalized.lastIndexOf("/");
    return idx >= 0 ? normalized.slice(0, idx) : "";
  }

  function canonicalizeKnownPage(path) {
    var normalized = normalizePath(path);
    if (!normalized) {
      return "";
    }
    if (state.pagesByFile.has(normalized)) {
      return normalized;
    }
    var lower = normalized.toLowerCase();
    if (state.pagesByFileLower.has(lower)) {
      return state.pagesByFileLower.get(lower);
    }
    return normalized;
  }

  function splitReference(target) {
    var raw = String(target || "").trim();
    var hash = "";
    var query = "";
    var path = raw;

    var hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      hash = path.slice(hashIndex + 1);
      path = path.slice(0, hashIndex);
    }

    var queryIndex = path.indexOf("?");
    if (queryIndex >= 0) {
      query = path.slice(queryIndex + 1);
      path = path.slice(0, queryIndex);
    }

    return {
      path: path,
      query: query,
      hash: hash
    };
  }

  function joinRelative(baseFolder, relativePath) {
    return normalizePath(baseFolder + "/" + relativePath);
  }

  function isUnsafeProtocol(url) {
    return /^\s*(javascript|data):/i.test(url);
  }

  function isAbsoluteProtocol(url) {
    return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(value) {
    var slug = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return slug || "section";
  }

  function fileNameToTitle(file) {
    var normalized = normalizePath(file);
    var basename = normalized.split("/").pop() || normalized;
    var noExt = basename.replace(/\.md$/i, "");
    return noExt
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Untitled";
  }

  function resolveMdTarget(currentFile, target, isImage) {
    var ref = splitReference(target);

    if (!ref.path && ref.hash) {
      if (isImage) {
        return "#";
      }
      return "?page=" + encodeURIComponent(currentFile) + "#" + encodeURIComponent(ref.hash);
    }

    if (isUnsafeProtocol(target)) {
      return "#";
    }

    if (isAbsoluteProtocol(ref.path) || ref.path.startsWith("/")) {
      var absoluteUrl = ref.path;
      if (ref.query) {
        absoluteUrl += "?" + ref.query;
      }
      if (ref.hash) {
        absoluteUrl += "#" + ref.hash;
      }
      return absoluteUrl;
    }

    var currentFolder = folderFromFile(currentFile);
    var resolved = joinRelative(currentFolder, ref.path);

    if (!isImage && /\.md$/i.test(resolved)) {
      var canonicalPage = canonicalizeKnownPage(resolved);
      var mdUrl = "?page=" + encodeURIComponent(canonicalPage);
      if (ref.hash) {
        mdUrl += "#" + encodeURIComponent(ref.hash);
      }
      return mdUrl;
    }

    var contentUrl = CONTENT_ROOT + "/" + encodePathForUrl(resolved);
    if (ref.query) {
      contentUrl += "?" + ref.query;
    }
    if (ref.hash) {
      contentUrl += "#" + ref.hash;
    }
    return contentUrl;
  }

  function renderInline(text, currentFile) {
    var escaped = escapeHtml(text);

    escaped = escaped.replace(/`([^`]+)`/g, function (_, code) {
      return "<code>" + code + "</code>";
    });

    escaped = escaped.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
      var resolved = resolveMdTarget(currentFile, src, true);
      return "<img src=\"" + escapeHtml(resolved) + "\" alt=\"" + alt + "\">";
    });

    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var resolved = resolveMdTarget(currentFile, href, false);
      var external = /^(https?:|mailto:|tel:)/i.test(resolved);
      var attrs = external ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
      return "<a href=\"" + escapeHtml(resolved) + "\"" + attrs + ">" + label + "</a>";
    });

    // Basic Markdown emphasis support for this lightweight renderer.
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/__([^_]+)__/g, "<strong>$1</strong>");

    return escaped;
  }

  function parseMarkdown(markdown, currentFile) {
    var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    var output = [];
    var paragraphBuffer = [];
    var inUl = false;
    var inOl = false;
    var headingCounts = new Map();
    var headings = [];

    function closeLists() {
      if (inUl) {
        output.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        output.push("</ol>");
        inOl = false;
      }
    }

    function flushParagraph() {
      if (!paragraphBuffer.length) {
        return;
      }
      var line = paragraphBuffer.join(" ").trim();
      paragraphBuffer = [];
      if (line) {
        output.push("<p>" + renderInline(line, currentFile) + "</p>");
      }
    }

    for (var i = 0; i < lines.length; i += 1) {
      var rawLine = lines[i];
      var line = rawLine.trim();

      if (!line) {
        flushParagraph();
        closeLists();
        continue;
      }

      var headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
      if (headingMatch) {
        flushParagraph();
        closeLists();
        var level = headingMatch[1].length;
        var headingText = headingMatch[2].trim();
        var baseId = slugify(headingText);
        var count = headingCounts.get(baseId) || 0;
        headingCounts.set(baseId, count + 1);
        var id = count ? baseId + "-" + count : baseId;
        headings.push({
          id: id,
          level: level,
          text: headingText
        });
        output.push("<h" + level + " id=\"" + id + "\">" + renderInline(headingText, currentFile) + "</h" + level + ">");
        continue;
      }

      var ulMatch = /^-\s+(.+)$/.exec(line);
      if (ulMatch) {
        flushParagraph();
        if (inOl) {
          output.push("</ol>");
          inOl = false;
        }
        if (!inUl) {
          output.push("<ul>");
          inUl = true;
        }
        output.push("<li>" + renderInline(ulMatch[1], currentFile) + "</li>");
        continue;
      }

      var olMatch = /^\d+\.\s+(.+)$/.exec(line);
      if (olMatch) {
        flushParagraph();
        if (inUl) {
          output.push("</ul>");
          inUl = false;
        }
        if (!inOl) {
          output.push("<ol>");
          inOl = true;
        }
        output.push("<li>" + renderInline(olMatch[1], currentFile) + "</li>");
        continue;
      }

      paragraphBuffer.push(rawLine.trim());
    }

    flushParagraph();
    closeLists();

    return {
      html: output.join("\n"),
      headings: headings
    };
  }

  function buildTableOfContents(headings) {
    var list = Array.isArray(headings) ? headings.filter(function (item) {
      return item && item.id && item.text && item.level >= 1 && item.level <= 6;
    }) : [];
    // Exclude the page title (first H1) from the TOC; users already see it in the article header.
    if (list.length > 0 && list[0].level === 1) {
      list = list.slice(1);
    }

    if (!list.length) {
      return "";
    }

    var root = { level: 0, children: [] };
    var stack = [root];

    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      var node = {
        id: item.id,
        level: item.level,
        text: item.text,
        children: []
      };

      while (stack.length > 1 && stack[stack.length - 1].level >= node.level) {
        stack.pop();
      }

      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }

    function renderNodes(nodes) {
      if (!nodes.length) {
        return "";
      }

      var html = "<ol>";
      for (var j = 0; j < nodes.length; j += 1) {
        var node = nodes[j];
        var hasChildren = node.children.length > 0;
        if (hasChildren) {
          html += (
            "<li class=\"wiki-toc-item wiki-toc-level-" + node.level + "\">" +
              "<details class=\"wiki-toc-node\">" +
                "<summary>" +
                  "<span class=\"wiki-toc-label\">" + escapeHtml(node.text) + "</span>" +
                "</summary>" +
                renderNodes(node.children) +
              "</details>" +
            "</li>"
          );
        } else {
          html += (
            "<li class=\"wiki-toc-item wiki-toc-level-" + node.level + "\">" +
              "<a class=\"wiki-toc-leaf-link\" href=\"#" + encodeURIComponent(node.id) + "\">" + escapeHtml(node.text) + "</a>" +
            "</li>"
          );
        }
      }
      html += "</ol>";
      return html;
    }

    return (
      "<details class=\"wiki-toc\">" +
        "<summary>Contents</summary>" +
        renderNodes(root.children) +
      "</details>"
    );
  }

  function extractFirstH1(markdown) {
    var lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
    for (var i = 0; i < lines.length; i += 1) {
      var match = /^#\s+(.+?)\s*$/.exec(lines[i].trim());
      if (match) {
        return match[1].trim();
      }
    }
    return "";
  }

  function cmpFile(a, b) {
    return a.file.localeCompare(b.file, undefined, { sensitivity: "accent", numeric: false });
  }

  async function fetchJson(path) {
    var res = await fetch(path + (path.indexOf("?") >= 0 ? "&" : "?") + nowBust(), {
      cache: "no-store"
    });
    if (!res.ok) {
      throw new Error("Failed to fetch JSON: " + path + " (" + res.status + ")");
    }
    return await res.json();
  }

  async function fetchText(path) {
    var res = await fetch(path + (path.indexOf("?") >= 0 ? "&" : "?") + nowBust(), {
      cache: "no-store"
    });
    if (!res.ok) {
      throw new Error("Failed to fetch text: " + path + " (" + res.status + ")");
    }
    return await res.text();
  }

  function isGitHubPages() {
    return /\.github\.io$/i.test(window.location.hostname);
  }

  async function buildManifestFromGitHubApi() {
    if (!isGitHubPages()) {
      return null;
    }

    var hostOwner = window.location.hostname.split(".")[0];
    var pathParts = window.location.pathname.split("/").filter(Boolean);
    var repo = "";

    if (pathParts.length > 0 && !/\.html?$/i.test(pathParts[0])) {
      repo = pathParts[0];
    } else {
      repo = hostOwner + ".github.io";
    }

    var repoMetaRes = await fetch("https://api.github.com/repos/" + encodeURIComponent(hostOwner) + "/" + encodeURIComponent(repo), {
      headers: { Accept: "application/vnd.github+json" }
    });

    if (!repoMetaRes.ok) {
      throw new Error("GitHub repo lookup failed (" + repoMetaRes.status + ")");
    }

    var repoMeta = await repoMetaRes.json();
    var branch = repoMeta.default_branch || "main";

    var treeRes = await fetch(
      "https://api.github.com/repos/" + encodeURIComponent(hostOwner) + "/" + encodeURIComponent(repo) + "/git/trees/" + encodeURIComponent(branch) + "?recursive=1",
      { headers: { Accept: "application/vnd.github+json" } }
    );

    if (!treeRes.ok) {
      throw new Error("GitHub tree lookup failed (" + treeRes.status + ")");
    }

    var treePayload = await treeRes.json();
    var items = Array.isArray(treePayload.tree) ? treePayload.tree : [];
    var prefix = "wiki/content/";

    var fallbackTitleMap = new Map();
    if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.manifest && Array.isArray(window.WIKI_FALLBACK.manifest.pages)) {
      window.WIKI_FALLBACK.manifest.pages.forEach(function (page) {
        var file = normalizePath(page && page.file ? page.file : "");
        var title = String(page && page.title ? page.title : "").trim();
        if (file && title) {
          fallbackTitleMap.set(file.toLowerCase(), title);
        }
      });
    }

    var pages = items
      .filter(function (entry) {
        return entry && entry.type === "blob" && typeof entry.path === "string" && entry.path.indexOf(prefix) === 0 && /\.md$/i.test(entry.path);
      })
      .map(function (entry) {
        var file = normalizePath(entry.path.slice(prefix.length));
        var fallbackTitle = fallbackTitleMap.get(file.toLowerCase()) || "";
        return {
          file: file,
          title: fallbackTitle || fileNameToTitle(file),
          folder: folderFromFile(file)
        };
      })
      .sort(cmpFile);

    if (!pages.length) {
      return null;
    }

    return {
      title: "RSTools Wiki",
      generatedAt: new Date().toISOString(),
      pages: pages,
      source: "github-api"
    };
  }

  async function loadManifest() {
    try {
      var staticManifest = await fetchJson(MANIFEST_PATH);
      if (staticManifest && Array.isArray(staticManifest.pages) && staticManifest.pages.length) {
        return staticManifest;
      }
    } catch (err2) {
      console.warn("Static manifest load failed:", err2);
    }

    if (window.WIKI_FALLBACK && window.WIKI_FALLBACK.manifest && Array.isArray(window.WIKI_FALLBACK.manifest.pages)) {
      return window.WIKI_FALLBACK.manifest;
    }

    if (isGitHubPages()) {
      try {
        var githubManifest = await buildManifestFromGitHubApi();
        if (githubManifest && githubManifest.pages && githubManifest.pages.length) {
          return githubManifest;
        }
      } catch (err) {
        console.warn("GitHub API manifest discovery failed:", err);
      }
    }

    throw new Error("No wiki manifest available.");
  }

  function buildTree(pages) {
    var root = { folders: new Map(), pages: [] };

    pages.forEach(function (page) {
      var folder = normalizePath(page.folder || "");
      var segments = folder ? folder.split("/") : [];
      var node = root;

      for (var i = 0; i < segments.length; i += 1) {
        var segment = segments[i];
        if (!node.folders.has(segment)) {
          node.folders.set(segment, { name: segment, fullPath: segments.slice(0, i + 1).join("/"), folders: new Map(), pages: [] });
        }
        node = node.folders.get(segment);
      }

      node.pages.push(page);
    });

    return root;
  }

  function renderNavigation() {
    if (!state.manifest || !Array.isArray(state.manifest.pages)) {
      navEl.innerHTML = "<p class=\"wiki-empty\">No pages found.</p>";
      return;
    }

    var pages = state.manifest.pages.slice().sort(cmpFile);
    var tree = buildTree(pages);

    var rootList = document.createElement("ul");
    rootList.className = "wiki-nav-root";

    function appendFolderNode(folderNode, parentList) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wiki-folder-toggle";
      btn.textContent = folderNode.name;

      var childList = document.createElement("ul");
      if (!String(folderNode.name || "").trim()) {
        return;
      }
      var folderPath = normalizePath(folderNode.fullPath || "");
      var openByDefault = state.expandedNavFolders.has(folderPath);

      btn.setAttribute("aria-expanded", openByDefault ? "true" : "false");
      childList.hidden = !openByDefault;

      btn.addEventListener("click", function () {
        var expanded = btn.getAttribute("aria-expanded") === "true";
        var willExpand = !expanded;
        btn.setAttribute("aria-expanded", willExpand ? "true" : "false");
        childList.hidden = !willExpand;
        if (willExpand) {
          state.expandedNavFolders.add(folderPath);
        } else {
          state.expandedNavFolders.delete(folderPath);
        }
      });

      renderNode(folderNode, childList);

      li.appendChild(btn);
      li.appendChild(childList);
      parentList.appendChild(li);
    }

    function appendPageNode(page, parentList) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.className = "wiki-nav-link" + (page.file === state.currentPage ? " active" : "");
      link.href = "?page=" + encodeURIComponent(page.file);
      link.dataset.page = page.file;
      link.textContent = page.title || fileNameToTitle(page.file);
      li.appendChild(link);
      parentList.appendChild(li);
    }

    function renderNode(node, list) {
      var folderEntries = Array.from(node.folders.values()).sort(function (a, b) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "accent" });
      });

      folderEntries.forEach(function (folderNode) {
        appendFolderNode(folderNode, list);
      });

      var sortedPages = node.pages.slice().sort(cmpFile);
      sortedPages.forEach(function (page) {
        appendPageNode(page, list);
      });
    }

    renderNode(tree, rootList);

    navEl.innerHTML = "";
    navEl.appendChild(rootList);

    navEl.querySelectorAll("a[data-page]").forEach(function (anchor) {
      anchor.addEventListener("click", function (ev) {
        ev.preventDefault();
        var page = anchor.dataset.page;
        goToPage(page);
      });
    });
  }

  async function loadPageMarkdown(file) {
    var normalized = canonicalizeKnownPage(file);
    if (!normalized) {
      throw new Error("Invalid page path.");
    }

    var path = CONTENT_ROOT + "/" + encodePathForUrl(normalized);

    try {
      return await fetchText(path);
    } catch (fetchErr) {
      var fallbackPages = window.WIKI_FALLBACK && window.WIKI_FALLBACK.pages ? window.WIKI_FALLBACK.pages : null;
      var fallback = fallbackPages ? fallbackPages[normalized] : null;
      if (typeof fallback !== "string" && fallbackPages) {
        var targetLower = normalized.toLowerCase();
        var keys = Object.keys(fallbackPages);
        for (var i = 0; i < keys.length; i += 1) {
          if (normalizePath(keys[i]).toLowerCase() === targetLower) {
            fallback = fallbackPages[keys[i]];
            break;
          }
        }
      }
      if (typeof fallback === "string") {
        return fallback;
      }
      throw fetchErr;
    }
  }

  function clearMatchState() {
    state.matches = [];
    state.activeMatchIndex = -1;
    if (findCountEl) {
      findCountEl.textContent = "0/0";
    }
  }

  function updateFindCounter() {
    if (!findCountEl) {
      return;
    }
    if (!state.matches.length) {
      findCountEl.textContent = "0/0";
      return;
    }
    findCountEl.textContent = (state.activeMatchIndex + 1) + "/" + state.matches.length;
  }

  function jumpToMatch(index) {
    if (!state.matches.length) {
      clearMatchState();
      return;
    }

    var normalized = index;
    while (normalized < 0) {
      normalized += state.matches.length;
    }
    normalized = normalized % state.matches.length;

    state.matches.forEach(function (match) {
      match.classList.remove("wiki-hit-active");
    });

    state.activeMatchIndex = normalized;
    var active = state.matches[state.activeMatchIndex];
    if (active) {
      active.classList.add("wiki-hit-active");
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    updateFindCounter();
  }

  function highlightTerm(term) {
    articleEl.innerHTML = state.articleBaseHtml;
    clearMatchState();

    var search = String(term || "").trim();
    if (!search) {
      return;
    }

    var regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    var walker = document.createTreeWalker(articleEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        if (["SCRIPT", "STYLE", "MARK"].indexOf(parent.tagName) >= 0) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var textNodes = [];
    var current;
    while ((current = walker.nextNode())) {
      textNodes.push(current);
    }

    textNodes.forEach(function (node) {
      var text = node.nodeValue;
      regex.lastIndex = 0;
      if (!regex.test(text)) {
        return;
      }

      var frag = document.createDocumentFragment();
      var lastIdx = 0;
      regex.lastIndex = 0;

      var match;
      while ((match = regex.exec(text))) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }

        var mark = document.createElement("mark");
        mark.className = "wiki-hit";
        mark.textContent = match[0];
        frag.appendChild(mark);

        lastIdx = match.index + match[0].length;
      }

      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }

      node.parentNode.replaceChild(frag, node);
    });

    state.matches = Array.from(articleEl.querySelectorAll("mark.wiki-hit"));
    if (state.matches.length) {
      jumpToMatch(0);
    } else {
      updateFindCounter();
    }
  }

  function highlightHashHeading() {
    if (!window.location.hash) {
      return;
    }

    var id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) {
      return;
    }

    var heading = articleEl.querySelector("#" + CSS.escape(id));
    if (!heading) {
      return;
    }

    heading.classList.add("wiki-heading-focus");
    heading.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(function () {
      heading.classList.remove("wiki-heading-focus");
    }, 1400);
  }

  function getQueryParams() {
    return new URLSearchParams(window.location.search || "");
  }

  function getSelectedPageFromUrl() {
    var params = getQueryParams();
    var requested = canonicalizeKnownPage(params.get("page") || "");
    if (requested) {
      return requested;
    }

    if (!state.manifest || !Array.isArray(state.manifest.pages) || !state.manifest.pages.length) {
      return "";
    }

    var hasIndex = state.manifest.pages.find(function (p) { return normalizePath(p.file) === "index.md"; });
    return hasIndex ? hasIndex.file : state.manifest.pages[0].file;
  }

  function setUrlState(page, preserveHash) {
    var url = new URL(window.location.href);
    url.searchParams.set("page", page);

    if (findInput) {
      var hitValue = String(findInput.value || "").trim();
      if (hitValue) {
        url.searchParams.set("hit", hitValue);
      } else {
        url.searchParams.delete("hit");
      }
    } else {
      url.searchParams.delete("hit");
    }

    if (!preserveHash) {
      url.hash = "";
    }

    history.pushState({}, "", url.toString());
  }

  async function renderPage(file) {
    var normalizedFile = canonicalizeKnownPage(file);
    state.currentPage = normalizedFile;

    renderNavigation();

    try {
      var markdown = await loadPageMarkdown(normalizedFile);
      var parsed = parseMarkdown(markdown, normalizedFile);
      var tocHtml = buildTableOfContents(parsed.headings);
      var html = tocHtml + parsed.html;
      articleEl.innerHTML = html;
      state.articleBaseHtml = html;

      var h1 = extractFirstH1(markdown);
      var pageMeta = state.pagesByFile.get(normalizedFile);
      if (pageMeta && h1) {
        pageMeta.title = h1;
      }

      if (hasFindUi) {
        var initialHit = getQueryParams().get("hit") || "";
        if (findInput.value !== initialHit) {
          findInput.value = initialHit;
        }
        highlightTerm(findInput.value);
      } else {
        clearMatchState();
      }
      highlightHashHeading();
      renderNavigation();
    } catch (err) {
      console.error(err);
      articleEl.innerHTML = "<p class=\"wiki-empty\">Unable to load page <code>" + escapeHtml(normalizedFile) + "</code>.</p>";
      state.articleBaseHtml = articleEl.innerHTML;
      clearMatchState();
    }
  }

  async function goToPage(page, preserveHash) {
    var normalized = canonicalizeKnownPage(page);
    if (!normalized) {
      return;
    }
    setUrlState(normalized, Boolean(preserveHash));
    await renderPage(normalized);
  }

  function wireArticleLinkIntercept() {
    articleEl.addEventListener("click", function (ev) {
      var link = ev.target.closest("a[href]");
      if (!link) {
        return;
      }

      var href = link.getAttribute("href") || "";
      if (href.startsWith("#")) {
        ev.preventDefault();
        var rawId = href.slice(1);
        var decodedId = "";
        try {
          decodedId = decodeURIComponent(rawId);
        } catch (err) {
          decodedId = rawId;
        }
        if (!decodedId) {
          return;
        }
        var target = document.getElementById(decodedId);
        if (!target) {
          return;
        }
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        var url = new URL(window.location.href);
        url.hash = encodeURIComponent(decodedId);
        history.replaceState({}, "", url.toString());
        highlightHashHeading();
        return;
      }
      if (!href.startsWith("?page=")) {
        return;
      }

      ev.preventDefault();
      var url = new URL(href, window.location.href);
      var page = canonicalizeKnownPage(url.searchParams.get("page") || "");
      if (!page) {
        return;
      }

      var targetHash = url.hash;
      goToPage(page, Boolean(targetHash)).then(function () {
        if (targetHash) {
          window.location.hash = targetHash;
          highlightHashHeading();
        }
      });
    });
  }

  function wireFindUi() {
    if (!hasFindUi) {
      return;
    }
    findInput.addEventListener("input", function () {
      var page = state.currentPage;
      var url = new URL(window.location.href);
      if (findInput.value.trim()) {
        url.searchParams.set("hit", findInput.value.trim());
      } else {
        url.searchParams.delete("hit");
      }
      url.searchParams.set("page", page);
      history.replaceState({}, "", url.toString());
      highlightTerm(findInput.value);
      highlightHashHeading();
    });

    findPrevBtn.addEventListener("click", function () {
      if (!state.matches.length) {
        return;
      }
      jumpToMatch(state.activeMatchIndex - 1);
    });

    findNextBtn.addEventListener("click", function () {
      if (!state.matches.length) {
        return;
      }
      jumpToMatch(state.activeMatchIndex + 1);
    });
  }

  async function init() {
    try {
      state.manifest = await loadManifest();
      state.manifest.pages = (Array.isArray(state.manifest.pages) ? state.manifest.pages : [])
        .map(function (page) {
          var file = normalizePath(page.file || "");
          var title = String(page.title || "").trim() || fileNameToTitle(file);
          var folder = normalizePath(page.folder || folderFromFile(file));
          return { file: file, title: title, folder: folder };
        })
        .filter(function (page) { return Boolean(page.file); })
        .sort(cmpFile);

      state.manifest.pages.forEach(function (page) {
        state.pagesByFile.set(page.file, page);
        state.pagesByFileLower.set(page.file.toLowerCase(), page.file);
      });

      wireFindUi();
      wireArticleLinkIntercept();

      var selected = getSelectedPageFromUrl();
      if (!selected) {
        articleEl.innerHTML = "<p class=\"wiki-empty\">No wiki pages available.</p>";
        navEl.innerHTML = "<p class=\"wiki-empty\">No pages found.</p>";
        return;
      }

      await renderPage(selected);
    } catch (err) {
      console.error(err);
      navEl.innerHTML = "<p class=\"wiki-empty\">Wiki navigation unavailable.</p>";
      articleEl.innerHTML = "<p class=\"wiki-empty\">Wiki failed to initialize.</p>";
      clearMatchState();
    }
  }

  window.addEventListener("hashchange", function () {
    highlightHashHeading();
  });

  window.addEventListener("popstate", function () {
    var page = getSelectedPageFromUrl();
    if (page) {
      if (normalizePath(page) === normalizePath(state.currentPage || "")) {
        highlightHashHeading();
        return;
      }
      renderPage(page);
    }
  });

  init();
})();

