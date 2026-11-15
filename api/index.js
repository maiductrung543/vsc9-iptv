// Danh sách kênh cố định hoặc tự động cập nhật
let customMatches = [
    {
        title: "HP-Media - Video Mẫu",
        url: "https://www.dailymotion.com/video/x9xxxx"
    }
];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Xử lý lưu cấu hình từ trang Admin (POST)
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

    // Kiểm tra xem người dùng đang truy cập giao diện quản trị hay đang lấy file M3U
    const path = req.url || '';
    const isApiRequest = path.includes('/api') || path.includes('m3u');

    // Nếu truy cập trang chủ (không có /api) thì hiện giao diện quản lý Admin
    if (!isApiRequest && !path.includes('action=admin')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Quản Lý Bot IPTV - HP-Media</title>
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
                <h2>🤖 Quản Lý IPTV - HP-Media</h2>
                <div class="link-box"><b>Link M3U (Dán dòng này vào app IPTV):</b><br><span id="m3u-link"></span></div>
                <div id="matches-container"></div>
                <button onclick="addMatch()">➕ Thêm Kênh Mới</button>
                <button class="save" onclick="saveMatches()">💾 Lưu Lại Thay Đổi</button>

                <script>
                    let matches = ${JSON.stringify(customMatches)};
                    const baseApiUrl = window.location.origin + (window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/') + 'api';
                    document.getElementById('m3u-link').innerText = baseApiUrl;

                    function render() {
                        let container = document.getElementById('matches-container');
                        container.innerHTML = '';
                        matches.forEach((m, index) => {
                            container.innerHTML += \`
                                <div class="match-card">
                                    <label>Tên Kênh:</label>
                                    <input type="text" value="\${m.title}" id="title-\${index}">
                                    <label>Đường Dẫn URL:</label>
                                    <input type="text" value="\${m.url}" id="url-\${index}">
                                    <button class="del" onclick="removeMatch(\${index})">🗑️ Xóa</button>
                                </div>
                            \`;
                        });
                    }

                    function addMatch() {
                        matches.push({ title: "Kênh mới", url: "https://" });
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
                            if(data.success) alert('Đã lưu thành công!');
                            else alert('Lỗi khi lưu!');
                        });
                    }
                    render();
                </script>
            </body>
            </html>
        `);
    }

    // --- PHẦN XUẤT FILE M3U CHUẨN CHO APP IPTV ---
    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    
    let m3uLines = ['#EXTM3U'];
    
    customMatches.forEach(m => {
        m3uLines.push(`#EXTINF:-1 group-title="HP-Media", ${m.title}`);
        m3uLines.push(m.url);
    });

    return res.end(m3uLines.join('\n'));
};
