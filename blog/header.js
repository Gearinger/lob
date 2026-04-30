// Shared header template for all blog pages
// Usage: add <script src="header.js" data-page="articles"></script> to page <head>

(function() {
  // Determine path depth from current script location
  const scripts = document.querySelectorAll('script[src]');
  let isPostsDir = false;
  for (const s of scripts) {
    if (s.src.includes('/posts/')) { isPostsDir = true; break; }
  }

  // Build correct nav link paths based on directory
  const articlesHref = isPostsDir ? 'index.html' : 'index.html';
  const gamesHref   = isPostsDir ? '../games/' : '../games/';
  const diaryHref    = isPostsDir ? '../diary/index.html' : 'diary/index.html';
  const aboutHref    = isPostsDir ? '../about.html' : 'about.html';

  const page = (function() {
    for (const s of scripts) {
      const p = s.getAttribute('data-page');
      if (p) return p;
    }
    // Infer from URL
    const u = location.pathname;
    if (u.includes('/posts/') || u.includes('/diary/')) return 'articles';
    if (u.includes('/games/')) return 'games';
    if (u.includes('/about')) return 'about';
    return 'articles';
  })();

  const navItems = [
    { label: 'Articles', href: articlesHref, key: 'articles' },
    { label: '游戏',     href: gamesHref,    key: 'games' },
    { label: '日记',     href: diaryHref,     key: 'diary' },
    { label: '关于',     href: aboutHref,     key: 'about' },
  ];

  const navHTML = navItems.map(n =>
    `<a href="${n.href}"${n.key === page ? ' class="active"' : ''}>${n.label}</a>`
  ).join('');

  const backURL = isPostsDir ? '../index.html' : 'index.html';

  const headerHTML = `<header>
<div class="header-inner">
  <a href="${backURL}" class="logo" style="text-decoration:none">
    <span class="logo-mark">🦞</span>
    <span>LOB</span>
  </a>
  <nav>${navHTML}</nav>
</div>
</header>`;

  document.body.insertAdjacentHTML('afterbegin', headerHTML);
})();
