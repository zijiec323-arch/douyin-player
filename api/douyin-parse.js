// Vercel Serverless Function 抖音无水印解析接口
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // 全局开启跨域，微信和前端页面都可以调用
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const shareUrl = req.query.url;
    if (!shareUrl) {
        return res.status(400).json({ code: 400, msg: "请传入抖音分享链接" });
    }

    try {
        // 第一步：跟进短链拿到真实视频页面地址
        const shortResp = await fetch(shareUrl, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
            }
        });
        const realPageUrl = shortResp.url;
        // 提取视频ID
        const videoIdMatches = realPageUrl.match(/video\/(\d+)/);
        if (!videoIdMatches) {
            return res.status(400).json({ code: 400, msg: "抖音链接格式不正确，无法提取视频ID" });
        }
        const videoId = videoIdMatches[1];
        
        // 调用抖音公开API拉取视频信息
        const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
        const apiResp = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://www.douyin.com/'
            }
        });
        const data = await apiResp.json();
        
        if (!data.item_list || data.item_list.length === 0) {
            return res.status(400).json({ code: 400, msg: "视频不存在或者已被删除" });
        }
        // 提取无水印MP4直链
        const noWatermarkUrl = data.item_list[0].video.play_addr.url_list[0];
        
        // 直接返回结果
        return res.status(200).json({
            code: 200,
            data: noWatermarkUrl,
            video_name: data.item_list[0].desc || `抖音视频 ${videoId}`
        });
        
    } catch (e) {
        console.error('解析错误', e);
        return res.status(500).json({ code: 500, msg: "视频解析服务暂时不可用，请稍后重试" });
    }
}
