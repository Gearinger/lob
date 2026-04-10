const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DATA_FILE = path.join(__dirname, 'codes.json');

function loadCodes() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveCodes(codes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(codes, null, 2));
}

function generateCode() {
  // 4位数字，0-9
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 只允许 JSON 响应
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // POST /admin/generate - 生成新验证码
  if (req.method === 'POST' && url.pathname === '/admin/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { count = 1 } = JSON.parse(body || '{}');
        const codes = loadCodes();
        const generated = [];
        
        for (let i = 0; i < Math.min(count, 20); i++) {
          let code;
          let attempts = 0;
          // 避免重复
          do {
            code = generateCode();
            attempts++;
          } while (codes[code] && attempts < 100);
          
          if (!codes[code]) {
            codes[code] = { used: false, created: Date.now() };
            generated.push(code);
          }
        }
        
        saveCodes(codes);
        
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          codes: generated,
          message: `生成了 ${generated.length} 个验证码`
        }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: '请求格式错误' }));
      }
      return;
    });
    return;
  }

  // GET /admin/codes - 查看所有验证码状态
  if (req.method === 'GET' && url.pathname === '/admin/codes') {
    const codes = loadCodes();
    const list = Object.entries(codes).map(([code, info]) => ({
      code,
      used: info.used,
      created: new Date(info.created).toISOString(),
      usedAt: info.usedAt ? new Date(info.usedAt).toISOString() : null
    }));
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, codes: list }));
    return;
  }

  // POST /api/validate - 验证验证码
  if (req.method === 'POST' && url.pathname === '/api/validate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { code } = JSON.parse(body || '{}');
        
        if (!code || !/^\d{4}$/.test(code)) {
          res.writeHead(200);
          res.end(JSON.stringify({ valid: false, error: '验证码格式错误' }));
          return;
        }

        const codes = loadCodes();
        
        if (!codes[code]) {
          res.writeHead(200);
          res.end(JSON.stringify({ valid: false, error: '验证码不存在' }));
          return;
        }

        if (codes[code].used) {
          res.writeHead(200);
          res.end(JSON.stringify({ valid: false, error: '验证码已使用' }));
          return;
        }

        // 标记为已使用
        codes[code].used = true;
        codes[code].usedAt = Date.now();
        saveCodes(codes);

        res.writeHead(200);
        res.end(JSON.stringify({ valid: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ valid: false, error: '请求格式错误' }));
      }
      return;
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`🎋 灵签后端服务运行中`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log('');
  console.log('接口说明：');
  console.log('  POST /admin/generate   - 生成验证码 (body: {count: N})');
  console.log('  GET  /admin/codes       - 查看所有验证码');
  console.log('  POST /api/validate      - 验证验证码 (body: {code: "1234"})');
});
