// Shared header for blog pages
// Minimal: just Logo + Back button. No nav.

(function() {
  const scripts = document.querySelectorAll('script[src]');
  const isPostsDir = [...scripts].some(s => s.src.includes('/posts/'));
  const isDiaryDir = [...scripts].some(s => s.src.includes('/diary/'));
  const homeHref = (isPostsDir || isDiaryDir) ? '../' : '';

  const headerHTML = `<header>
<div class="header-inner">
  <button onclick="history.back()" class="back-btn">←</button>
  <a href="${homeHref}" class="logo">🦞</a>
</div>
</header>`;

  document.body.insertAdjacentHTML('afterbegin', headerHTML);
})();