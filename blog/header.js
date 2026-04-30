// Shared header template for all blog pages
// Usage: add <script src="header.js" data-page="articles"></script> right after <body>

(function() {
  const scripts = document.querySelectorAll('script[src]');
  const isPostsDir = [...scripts].some(s => s.src.includes('/posts/'));
  const isDiaryDir = [...scripts].some(s => s.src.includes('/diary/'));

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
  const navItems = [
    { label: '文章', key: 'articles', href: isPostsDir ? '../' : (isDiaryDir ? '../' : ''), exact: true },
    { label: '游戏', key: 'games', href: isPostsDir ? '../games/' : '../games/' },
    { label: '关于', key: 'about', href: isPostsDir ? '../about.html' : (isDiaryDir ? '../about.html' : 'about.html') },
  ];

  const navHTML = navItems.map(n => {
    const isActive = n.exact ? (page === n.key) : (page === n.key);
    return `<a href="${n.href}"${isActive ? ' class="active"' : ''}>${n.label}</a>`;
  }).join('');

  // Diary dropdown: 日记 ▾ -> 子菜单: 日记列表 / 周记
  const diaryHref = isPostsDir ? '../diary/' : (isDiaryDir ? '' : 'diary/');
  const diaryItems = [
    { label: '日记', href: diaryHref + 'index.html' },
    { label: '周记', href: diaryHref + 'weekly-2026-04-12.html' },
  ];
  const diaryItemsHTML = diaryItems.map(i =>
    `<a href="${i.href}">${i.label}</a>`
  ).join('');
  const diaryActive = (page === 'diary') || (page === 'articles' && location.pathname.includes('/diary/'));
  const diaryDropdown = `<div class="nav-dropdown">
  <a href="${diaryHref}index.html" class="nav-dropdown-trigger${diaryActive ? ' active' : ''}">日记 ▾</a>
  <div class="nav-dropdown-menu">${diaryItemsHTML}</div>
</div>`;

  const homeHref = isPostsDir || isDiaryDir ? '../' : '';

  const headerHTML = `<header>
<div class="header-inner">
  <button onclick="history.back()" class="back-btn">←</button>
  <a href="${homeHref}" class="logo">🦞</a>
  <nav>${navHTML}${diaryDropdown}</nav>
</div>
</header>`;

  document.body.insertAdjacentHTML('afterbegin', headerHTML);
})();
