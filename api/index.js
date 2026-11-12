module.exports = async function handler(req, res) {
    // 1. Cấu hình CORS và Header cho M3U
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const groupTitle = "VSC9 Live";
    const fallbackM3U = `#EXTM3U\n\n#EXTINF:-1 group-title="${groupTitle}", Đang kết nối tới VSC9...\nhttp://invalid`;

    try {
        const TARGET_URL = "https://vsc9.vip";
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        let response;
        try {
            response = await fetch(TARGET_URL, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'vi-VN,vi;q=0.9',
                    'Referer': TARGET_URL
                }
            });
        } catch (err) {
            clearTimeout(timeoutId);
            return res.end(fallbackM3U);
        }
        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.end(`#EXTM3U\n\n#EXTINF:-1 group-title="${groupTitle}", Lỗi phản hồi từ trang chủ.\nhttp://invalid`);
        }

        const html = await response.text();
        const matchDict = {};

        let mainSiteLogo = "https://cdn-icons-png.flaticon.com/512/8112/8112602.png";
        const logoMatch = html.match(/<img[^>]+src=["']([^"']*logo[^"']*)["'][^>]*>/i);
        if (logoMatch && logoMatch[1]) {
            let src = logoMatch[1];
            mainSiteLogo = src.startsWith('http') ? src : TARGET_URL + (src.startsWith('/') ? '' : '/') + src;
        }

        function decodeHTMLEntities(text) {
            if (!text) return "";
            return text
                .replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec))
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
        }

        // Bot tự động quét dữ liệu Next.js JSON ngầm của trang
        const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>(.*?)<\/script>/s);
        if (nextDataMatch && nextDataMatch[1]) {
            try {
                const nextData = JSON.parse(nextDataMatch[1]);
                function scanJson(obj) {
                    if (!obj || typeof obj !== 'object') return;
                    
                    // Nhận diện cấu trúc trận đấu có tên đội nhà và đội khách
                    let t1 = obj.home_name || obj.homeTeam || obj.team1 || "";
                    let t2 = obj.away_name || obj.awayTeam || obj.team2 || "";
                    
                    if (t1 && t2) {
                        let timeStr = obj.match_time || obj.time || "";
                        let dateStr = obj.match_date || obj.date || "";
                        let timeDate = timeStr && dateStr ? `${timeStr} - ${dateStr}` : (timeStr || dateStr);
                        
                        let stream = obj.stream_url || obj.play_url || obj.m3u8 || "";
                        if (!stream && obj.slug) stream = `${TARGET_URL}/tran-dau/${obj.slug}`;
                        else if (!stream && obj.id) stream = `${TARGET_URL}/tran-dau/${obj.id}`;
                        else if (!stream) stream = TARGET_URL;

                        let blv = obj.commentator_name || obj.blv || "";
                        let key = `${t1} VS ${t2} - ${timeDate}`;
                        
                        if (!matchDict[key]) {
                            matchDict[key] = {
                                teams: `${t1} VS ${t2}`,
                                time: timeDate,
                                blv: blv,
                                url: stream
                            };
                        }
                    }
                    for (let k in obj) {
                        if (obj.hasOwnProperty(k)) scanJson(obj[k]);
                    }
                }
                if (nextData?.props?.pageProps) {
                    scanJson(nextData.props.pageProps);
                }
            } catch (e) {}
        }

        // Bot quét dự phòng qua thẻ HTML nếu JSON không đủ
        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
            let href = match[1];
            let rawText = decodeHTMLEntities(match[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
            
            if (rawText.includes("VS") || rawText.includes("vs")) {
                let parts = rawText.split(/VS|vs/i).map(p => p.trim());
                if (parts.length >= 2) {
                    let t1 = parts[0].replace(/^[\d:\-\/\s]+/, '').trim();
                    let t2 = parts[1].replace(/[\d:\-\/\s]+$/, '').trim();
                    if (t1.length > 1 && t2.length > 1) {
                        let key = `${t1} VS ${t2}`;
                        let fullUrl = href.startsWith('http') ? href : TARGET_URL + (href.startsWith('/') ? '' : '/') + href;
                        if (!matchDict[key]) {
                            matchDict[key] = {
                                teams: key,
                                time: "",
                                blv: "",
                                url: fullUrl
                            };
                        }
                    }
                }
            }
        }

        const results = [];
        const vlcOpt = "#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

        for (let k in matchDict) {
            let item = matchDict[k];
            let timeInfo = item.time ? `[${item.time}] ` : "";
            let blvInfo = item.blv ? ` (BLV ${item.blv})` : "";
            
            results.push(`#EXTINF:-1 group-title="${groupTitle}" tvg-logo="${mainSiteLogo}", ${timeInfo}${item.teams}${blvInfo}\n${vlcOpt}\n${item.url}`);
        }

        const finalM3U = results.length === 0 
            ? `#EXTM3U\n\n#EXTINF:-1 group-title="${groupTitle}", Không tìm thấy trận đấu trực tiếp nào lúc này.\nhttp://invalid` 
            : "#EXTM3U\n\n" + results.join("\n\n");

        return res.end(finalM3U);

    } catch (error) {
        return res.end(fallbackM3U);
    }
};
