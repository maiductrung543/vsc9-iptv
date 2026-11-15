module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');

    // Danh sách kênh cố định hoặc bạn có thể thay thế bằng logic lấy dữ liệu
    const matches = [
        {
            title: "HP-Media - Video Mẫu",
            url: "https://www.dailymotion.com/video/x9xxxx"
        },
        {
            title: "Kênh Dự Phòng VSC9",
            url: "https://vsc9.vip"
        }
    ];

    let m3uLines = ['#EXTM3U'];
    
    matches.forEach(m => {
        m3uLines.push(`#EXTINF:-1 group-title="HP-Media Dailymotion", ${m.title}`);
        m3uLines.push(m.url);
    });

    return res.status(200).send(m3uLines.join('\n'));
};
