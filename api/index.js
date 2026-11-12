let customMatches = [
    {
        title: "Ghana vs Somalia (BLV Lưu Bang)",
        url: "https://vsc9.vip"
    }
];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const urlParams = new URL(req.url, `https://${req.headers.host}`);
    const action = urlParams.searchParams.get('action');

    // Nếu gửi dữ liệu cập nhật từ web quản lý
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data && Array.isArray(data.matches)) {
                    customMatches = data.matches;
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
            }
        });
        return;
    }

    // Nếu không có chữ /api hoặc truy cập thẳng web quản lý
    if (action === 'admin' || (!req.url.includes('/api') && req.url === '/')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Quản Lý Bot IPTV</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #121212; color: #fff; padding: 15px; margin: 0; }
                    h2 { color: #00ffcc; text-align: center; }
                    .match-card { background: #1e1e1e; padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid #333; }
                    input { width: 100%; padding: 10px; margin: 5px 0 10px 0; background: #2c2c2c; border: 1px solid #444; color: #fff; border-radius: 4px; box-sizing: border-box; }
                    button { background: #00ffcc; color: #000; border: none; padding: 10px 15px; font-weight: bold; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 5px; }
                    button.del { background: #ff4444; color: #fff; margin-top: 10px; }
                    button.save { background: #4CAF50; color: #fff; font-size: 16px; margin-top: 15px; }
                    .link-box { background: #222; padding: 10px; border-radius: 5px; word-break: break-all; margin-bottom: 15px; font-size: 14px; border: 1px dashed #00ffcc; }
                </style>
            </head>
            <body>
                <h2>🤖 Trạm Điều Hành Bot IPTV</h2>
                <div class="link-box"><b>Link M3U cho App IPTV:</b><br><span id="m3u-link"></span></div>
                <div id="matches-container"></div>
                <button onclick="addMatch()">➕ Thêm Trận Mới</button>
                <button class="save" onclick="saveMatches()">💾 Lưu Lại Thay Đổi</button>

                <script>
                    let matches = ${JSON.stringify(customMatches)};
                    document.getElementById('m3u-link').innerText = window.location.origin + window.location.pathname.replace(/\\/api$/, '') + '/api';

                    function render() {
                        let container = document.getElementById('matches-container');
                        container.innerHTML = '';
                        matches.forEach((m, index) => {
                            container.innerHTML += \`
                                <div class="match-card">
                                    <label>Tên Kênh / Trận Đấu:</label>
                                    <input type="text" value="\${m.title}" id="title-\${index}">
                                    <label>Đường Dẫn Stream (Link M3U8 / Web):</label>
                                    <input type="text" value="\${m.url}" id="url-\${index}">
                                    <button class="del" onclick="removeMatch(\${index})">🗑️ Xóa Kênh Này</button>
                                </div>
                            \`;
                        });
                    }

                    function addMatch() {
                        matches.push({ title: "Tên trận mới", url: "https://" });
                        render();
                    }

                    function removeMatch(index) {
                        matches.splice(index, 1);
                        render();
                    }

                    function saveMatches() {
                        matches = matches.map((m, index) => ({
                            title: document.getElementById('title-' + index).value,
                            url: document.getElementById('url-' + index).value
                        }));

                        fetch(window.location.href, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ matches: matches })
                        }).then(res => res.json()).then(data => {
                            if(data.success) alert('Đã lưu cấu hình thành công! App IPTV có thể load ngay.');
                            else alert('Lỗi khi lưu!');
                        });
                    }
                    render();
                </script>
            </body>
            </html>
        `);
    }

    // Xuất định dạng M3U chuẩn cho app IPTV khi gọi vào đuôi /api
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const groupTitle = "Bot Tự Tạo";
    const vlcOpt = "#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36";
    
    let results = [];
    customMatches.forEach(m => {
        results.push(`#EXTINF:-1 group-title="${groupTitle}", ${m.title}\n${vlcOpt}\n${m.url}`);
    });

    const finalM3U = "#EXTM3U\n\n" + results.join("\n\n");
    return res.end(finalM3U);
};
