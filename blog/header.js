// Shared header template for all blog pages
// Usage: add <script src="header.js" data-page="articles"></script> to page <head>

const HEADER_HTML = `
<header>
<div class="hh">
  <button class="bb" onclick="history.back()">← Back</button>
  <div class="logo"><span class="logo-m">🦞</span><span>LOB</span></div>
  <nav>
    <a href="index.html" data-nav="articles">Articles</a>
    <a href="../games/" data-nav="games">Games</a>
    <a href="diary/index.html" data-nav="diary">日记</a>
    <a href="../about.html" data-nav="about">About</a>
  </nav>
</div>
</header>
`;

(function() {
  // Get current page identifier from script tag
  const script = document.currentScript || document.querySelector('script[data-page]');
  const page = script ? script.getAttribute('data-page') : '';

  // Inject header
  document.body.insertAdjacentHTML('afterbegin', HEADER_HTML);

  // Mark active nav item
  if (page) {
    const activeLink = document.querySelector(`[data-nav="${page}"]`);
    if (activeLink) activeLink.classList.add('active');
  }

  // Fix nav links based on page depth
  const depth = (script && script.getAttribute('data-depth')) || '0';
  const d = parseInt(depth);

  if (d === 0) {
    // Same directory (posts/), no change needed
  } else if (d === 1) {
    // One level up (diary/)
    document.querySelectorAll('nav a').forEach(a => {
      if (!a.getAttribute('href').startsWith('#')) {
        a.href = '../' + a.getAttribute('href');
      }
    });
    document.querySelector('.bb').onclick = () => { window.location.href = '../index.html'; };
  }
})();
