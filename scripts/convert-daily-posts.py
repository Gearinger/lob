#!/usr/bin/env python3
"""批量将每日精选文章页从暖色旧风转换为暗色设计 v1.6 风格"""

import re
import os

OLD_CSS = """
*{margin:0;padding:0;box-sizing:border-box}
body{background:#FFF5EE;color:#3D2A35;font-family:-apple-system,'PingFang SC',sans-serif;min-height:100vh;line-height:1.9}
a{color:inherit;text-decoration:none}
.ambient{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.ambient::before{content:'';position:absolute;width:500px;height:500px;background:rgba(255,143,80,0.18);border-radius:50%;filter:blur(100px);top:-150px;right:-100px}
.ambient::after{content:'';position:absolute;width:400px;height:400px;background:rgba(168,216,255,0.2);border-radius:50%;filter:blur(100px);bottom:-100px;left:-100px}
header{position:sticky;top:0;z-index:100;backdrop-filter:blur(16px);background:rgba(255,255,255,0.75);border-bottom:1px solid rgba(200,140,80,0.12)}
.hh{max-width:720px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between}
.bb{display:flex;align-items:center;gap:8px;font-size:0.82rem;color:rgba(138,112,128,0.7);cursor:pointer;border:none;background:none;padding:0;transition:color .2s}
.bb:hover{color:#E88A3D}
.logo{font-size:0.8rem;color:rgba(138,112,128,0.7);letter-spacing:0.15em;display:flex;align-items:center;gap:10px}
.logo-m{font-size:1.2rem}
nav{display:flex;gap:28px}
nav a{font-size:0.82rem;color:rgba(138,112,128,0.7);letter-spacing:0.05em;transition:color .2s}
nav a:hover,nav a.active{color:#E88A3D}
article{position:relative;z-index:2;max-width:720px;margin:0 auto;padding:64px 24px 120px}
.ah{margin-bottom:48px}
.am{display:flex;gap:12px;align-items:center;margin-bottom:20px}
.tag{font-size:0.68rem;padding:3px 10px;border-radius:20px}
.ts{background:rgba(255,179,128,0.2);color:#C46A2A}
.ad{font-size:0.72rem;color:#9A8090}
.at{font-size:clamp(1.6rem,5vw,2.2rem);font-weight:700;line-height:1.25;letter-spacing:-0.02em;margin-bottom:16px;color:#3D2A35}
.adiv{height:1px;background:linear-gradient(90deg,rgba(255,143,80,0.25),rgba(255,143,80,0.06),transparent);margin:40px 0}
.content{font-size:0.95rem;color:#5A4A45}
.content p{margin-bottom:20px}
.content h2{font-size:1.05rem;font-weight:600;color:#3D2A35;margin:40px 0 12px;padding-top:12px;border-top:1px solid rgba(200,140,80,0.08)}
.content li{font-size:0.95rem;margin-bottom:12px}
.content li p{margin-bottom:8px}
.content blockquote{border-left:3px solid rgba(255,143,80,0.4);padding-left:16px;margin:20px 0;color:#7A6A55;font-style:italic}
.content strong{color:#3D2A35;font-weight:600}
.content em{font-style:italic;color:#6A5A45}
.content hr{display:none}
.ss{margin-top:56px;padding-top:32px;border-top:1px solid rgba(200,140,80,0.08)}
.st{font-size:0.72rem;color:#9A8090;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px}
.tags{display:flex;gap:8px;flex-wrap:wrap}
.tag-p{font-size:0.75rem;padding:6px 14px;border-radius:20px;border:1px solid rgba(200,140,80,0.15);color:#8A7080;cursor:pointer;transition:all .2s}
.tag-p:hover{border-color:rgba(200,140,80,0.35);color:#E88A3D}
footer{position:relative;z-index:2;max-width:720px;margin:0 auto;padding:40px 24px;border-top:1px solid rgba(200,140,80,0.08);display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;color:#9A8090}
@media(max-width:640px){article{padding:40px 16px 80px}.at{font-size:1.5rem}}
"""

NEW_CSS = """
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg-deep);color:var(--text-primary);font-family:-apple-system,'PingFang SC',sans-serif;min-height:100vh;line-height:1.9}
a{color:inherit;text-decoration:none}
::selection{background:rgba(103,232,249,0.25);color:var(--text-primary)}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2)}
:focus-visible{outline:2px solid var(--accent-primary);outline-offset:2px;border-radius:4px}
header{position:sticky;top:0;z-index:100;backdrop-filter:blur(16px);background:rgba(0,0,0,0.6);border-bottom:1px solid var(--border)}
.hh{max-width:720px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between}
.bb{display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--text-secondary);cursor:pointer;border:none;background:none;padding:0;transition:color .2s}
.bb:hover{color:var(--accent-primary)}
.logo{font-size:0.8rem;color:var(--text-secondary);letter-spacing:0.15em;display:flex;align-items:center;gap:10px}
.logo-m{font-size:1.2rem}
nav{display:flex;gap:28px}
nav a{font-size:0.82rem;color:var(--text-secondary);letter-spacing:0.05em;transition:color .2s}
nav a:hover,nav a.active{color:var(--accent-primary)}
article{position:relative;z-index:2;max-width:720px;margin:0 auto;padding:64px 24px 120px}
.ah{margin-bottom:48px}
.am{display:flex;gap:12px;align-items:center;margin-bottom:20px}
.tag{font-size:0.68rem;padding:3px 10px;border-radius:20px}
.ts{background:rgba(103,232,249,0.1);color:var(--accent-primary)}
.ad{font-size:0.72rem;color:var(--text-muted)}
.at{font-size:clamp(1.6rem,5vw,2.2rem);font-weight:700;line-height:1.25;letter-spacing:-0.02em;margin-bottom:16px;color:var(--text-primary)}
.adiv{height:1px;background:linear-gradient(90deg,var(--border),transparent);margin:40px 0}
.content{font-size:0.95rem;color:var(--text-secondary)}
.content p{margin-bottom:20px}
.content h2{font-size:1.05rem;font-weight:600;color:var(--text-primary);margin:40px 0 12px;padding-top:12px;border-top:1px solid var(--border)}
.content li{font-size:0.95rem;margin-bottom:12px}
.content li p{margin-bottom:8px}
.content blockquote{border-left:3px solid var(--accent-primary);padding-left:16px;margin:20px 0;color:var(--text-secondary);font-style:italic}
.content strong{color:var(--text-primary);font-weight:600}
.content em{font-style:italic;color:var(--text-secondary)}
.content hr{display:none}
.ss{margin-top:56px;padding-top:32px;border-top:1px solid var(--border)}
.st{font-size:0.72rem;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px}
.tags{display:flex;gap:8px;flex-wrap:wrap}
.tag-p{font-size:0.75rem;padding:6px 14px;border-radius:20px;border:1px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:all .2s}
.tag-p:hover{border-color:var(--accent-primary);color:var(--accent-primary)}
footer{position:relative;z-index:2;max-width:720px;margin:0 auto;padding:40px 24px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;color:var(--text-muted)}
@media(max-width:640px){article{padding:40px 16px 80px}.at{font-size:1.5rem}}
"""

posts_dir = "/Users/gear/lob/blog/posts"
count = 0

for fname in sorted(os.listdir(posts_dir)):
    if not fname.startswith("daily-"):
        continue
    path = os.path.join(posts_dir, fname)
    if not os.path.isfile(path):
        continue

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if 'background:#FFF5EE' not in content:
        continue

    # Replace the old CSS block
    new_content = content.replace(OLD_CSS.strip(), NEW_CSS.strip())

    # Also handle any remaining warm colors as fallback
    warm_colors = ["#FFF5EE", "#FFFAF8", "#3D2A35", "#E88A3D", "#FFB07A",
                   "#FF8FA3", "#A8D8FF", "#FFB3C6", "#9A8090", "#8A7080",
                   "#C46A2A", "#7A6A55", "#6A5A45", "#5A4A45"]
    for c in warm_colors:
        if c.lower() in new_content.lower():
            print(f"  WARN: {fname} still has {c}")

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    count += 1

print(f"Done: {count} files updated")
