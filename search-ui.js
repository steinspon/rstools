(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildSearchForm() {
    return '' +
      '<form class="search-form" action="search.html" method="get" role="search" aria-label="Search">' +
        '<button type="submit" aria-label="Search">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 3a7.2 7.2 0 015.72 11.58l4.25 4.26-1.42 1.41-4.25-4.25A7.2 7.2 0 1110.2 3zm0 2a5.2 5.2 0 100 10.4 5.2 5.2 0 000-10.4z"/></svg>' +
        '</button>' +
        '<input class="search-input" name="q" type="search" placeholder="Search" autocomplete="off" />' +
        '<button class="search-reset" type="reset" aria-label="Clear search">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z"/></svg>' +
        '</button>' +
      '</form>';
  }

  function wireForm(form) {
    var resetButton = form.querySelector('.search-reset');
    var input = form.querySelector('.search-input');

    if (resetButton && input) {
      resetButton.addEventListener('click', function () {
        window.setTimeout(function () {
          input.focus();
        }, 0);
      });
    }

    var params = new URLSearchParams(window.location.search || '');
    var q = (params.get('q') || '').trim();
    if (q && input) {
      input.value = q;
    }
  }

  function initHeaderSearch() {
    var metas = document.querySelectorAll('.app-meta');
    if (!metas.length) return;

    metas.forEach(function (meta) {
      if (meta.querySelector('.search-form')) return;
      meta.innerHTML = buildSearchForm();
      var form = meta.querySelector('.search-form');
      if (form) {
        wireForm(form);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderSearch);
  } else {
    initHeaderSearch();
  }
})();
