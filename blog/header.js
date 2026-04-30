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
  const articlesHref = 'index.html';
  const gamesHref   = isPostsDir ? '../games/' : '../games/';
  const diaryHref    = isPostsDir ? '../diary/index.html' : 'diary/index.html';
  const aboutHref    = isPostsDir ? '../about.html' : 'about.html';
  const logoHref     = isPostsDir ? '../' : '';

  const page = (function() {
    for (const s of scripts) {
      const p = s.getAttribute('data-page');
      if (p) return p;
    }
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

  const backURL = isPostsDir ? '../' : '';

  const headerHTML = `<header>
<div class="header-inner">
  <button onclick="history.back()" style="font-size:0.82rem;color:var(--text-secondary);cursor:pointer;border:none;background:none;padding:0;transition:color 0.2s;" onmouseover="this.style.color='var(--accent-primary)'" onmouseout="this.style.color='var(--text-secondary)'">← Back</button>
  <a href="${logoHref}" class="logo" style="text-decoration:none">
    <span class="logo-mark">🦞</span>
    <span>LOB</span>
  </a>
  <nav>${navHTML}</nav>
</div>
</header>`;

  document.body.insertAdjacentHTML('afterbegin', headerHTML);
})();
