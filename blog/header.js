// Shared header template for all blog pages
// Usage: add <script src="header.js" data-page="articles"></script> right after <body>

(function() {
  const scripts = document.querySelectorAll('script[src]');
  const isPostsDir = [...scripts].some(s => s.src.includes('/posts/'));
  const isDiaryDir = [...scripts].some(s => s.src.includes('/diary/'));

  // Determine current page from URL and data-page attribute
  const page = (function() {
    for (const s of scripts) {
      const p = s.getAttribute('data-page');
      if (p) return p;
    }
    const u = location.pathname;
    if (/\/posts?\/|diary/.test(u)) return 'articles';
    if (/games/.test(u)) return 'games';
    if (/about/.test(u)) return 'about';
    return 'articles';
  })();

  // Build nav links
  const navLinks = [
    { label: '文章', key: 'articles', href: isPostsDir ? '../' : (isDiaryDir ? '../' : ''), exact: true },
    { label: '游戏',     key: 'games',    href: isPostsDir ? '../games/' : '../games/' },
    { label: '日记',     key: 'diary',    href: isPostsDir ? '../diary/' : (isDiaryDir ? '' : 'diary/') },
    { label: '关于',     key: 'about',    href: isPostsDir ? '../about.html' : (isDiaryDir ? '../about.html' : 'about.html') },
  ];

  const homeHref = isPostsDir || isDiaryDir ? '../' : '';

  const navHTML = navLinks.map(n => {
    const isActive = n.exact ? (page === n.key) : (page === n.key);
    return `<a href="${n.href}"${isActive ? ' class="active"' : ''}>${n.label}</a>`;
  }).join('');

  const headerHTML = `<header>
<div class="header-inner">
  <button onclick="history.back()" class="back-btn">←</button>
  <a href="${homeHref}" class="logo">🦞</a>
  <nav>${navHTML}</nav>
</div>
</header>`;

  document.body.insertAdjacentHTML('afterbegin', headerHTML);
})();
