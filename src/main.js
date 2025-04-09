const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs').promises;

// Base64 解码
function base64Decode(str) {
    try {
        return Buffer.from(str, 'base64').toString('utf8');
    } catch (e) {
        return '[base64解码失败]';
    }
}

// Base64 编码
function base64Encode(str) {
    return Buffer.from(encodeURIComponent(str), 'utf8').toString('base64');
}

// 模拟 fetch 的函数
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function fetchSubLink(url) {
    const html = await fetchUrl(url);
    const $ = cheerio.load(html);

    const links = [];
    const linkElements = $(".entry-content.cf").find("a.blogcard-wrap.external-blogcard-wrap.a-wrap.cf");

    for (let i = 0; i < linkElements.length; i++) {
        const link = $(linkElements[i]).attr('href')?.trim();
        const linkTitle = $(linkElements[i]).attr('title')?.trim();
        if (linkTitle === link) {
            links.push(link);
        }
    }

    return links;
}

async function fetchFirstLink(url) {
    const html = await fetchUrl(url);
    const $ = cheerio.load(html);
    const link = $('.ect-entry-card a').first().attr('href');
    return link;
}

// 主函数
async function main() {
    const forceAll = true;

    const firstLink = await fetchFirstLink("https://hbxfx.xyz");

    console.log('First link:', firstLink);

    if (!firstLink) {
        throw new Error('No link found');
    }

    const links = await fetchSubLink(firstLink);

    if (links.length === 0) {
        throw new Error('No links found');
    }

    let result;
    if (forceAll) {
        const contents = await Promise.all(
            links.map(async (link) => {
                try {
                    const text = await fetchUrl(link);
                    return base64Decode(text);
                } catch {
                    return '[ERROR] 请求失败或解码失败';
                }
            })
        );

        const merged = contents.join('\n');
        result = base64Encode(merged);
    } else {
        const randomIndex = Math.floor(Math.random() * links.length);
        result = await fetchUrl(links[randomIndex]);
    }

    // 确保目录存在并写入文件
    const outputDir = 'data';
    const outputFile = `${outputDir}/output.txt`;
    await fs.mkdir(outputDir, { recursive: true }); // 创建目录（如果不存在）
    await fs.writeFile(outputFile, result, 'utf8');
    console.log(`结果已保存到 ${outputFile}`);
}

main().catch(err => {
    console.error('执行出错:', err);
    process.exit(1); // 退出码 1 表示错误，GitHub Actions 会检测到
});