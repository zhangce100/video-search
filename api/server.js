/**
 * 全网视频搜索 API v3.0 - TV Edition
 * 40+ 平台聚合搜索
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 9000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// ─── HTTP Fetch ───────────────────────────────────────────────────────────────

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const timeout = options.timeout || 10000;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...options.headers,
    };
    const req = mod.get(url, { headers, timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location, options).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function cleanHTML(s) { return (s || '').replace(/<[^>]+>/g, ''); }
function formatSeconds(sec) {
  if (!sec) return '';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function makeId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(36);
}
function enc(s) { return encodeURIComponent(s); }
function linkItem({ id, title, desc, url, source, sourceName, license }) {
  return { id: id || source + '-' + makeId(title), title, description: desc || '', thumbnail: '', url, source, source_name: sourceName, type: 'link', extra: license ? { license } : {} };
}

// ══════════════════════════════════════════════════════════════════════════════
//  SOURCES
// ══════════════════════════════════════════════════════════════════════════════

async function searchBilibili(query, page = 1, pageSize = 20) {
  const items = [];
  try {
    const data = await fetchJSON(`https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${enc(query)}&page=${page}&pagesize=${Math.min(pageSize, 30)}&order=totalrank`);
    for (const v of (data?.data?.result || [])) {
      let pic = v.pic || ''; if (pic.startsWith('//')) pic = 'https:' + pic;
      let durSec = 0;
      if (v.duration) { const p = v.duration.split(':').map(Number); if (p.length === 2) durSec = p[0] * 60 + p[1]; else if (p.length === 3) durSec = p[0] * 3600 + p[1] * 60 + p[2]; }
      items.push({ id: v.bvid || '', title: cleanHTML(v.title || ''), description: (v.description || '').substring(0, 200), thumbnail: pic, url: `https://www.bilibili.com/video/${v.bvid}`, source: 'bilibili', source_name: 'B站', duration: v.duration || '', duration_sec: durSec, author: v.author || '', play_count: typeof v.play === 'number' ? v.play : 0, publish_time: v.pubdate || '', tags: (v.tag || []).map(t => typeof t === 'object' ? t.tag : t).filter(Boolean), type: 'video' });
    }
  } catch (e) { console.error('[bilibili]', e.message); }
  return items;
}

const INVIDIOUS = ['https://vid.puffyan.us', 'https://inv.nadeko.net', 'https://yewtu.be', 'https://invidious.fdn.fr', 'https://iv.ggtyler.dev'];
async function searchYouTube(query, page = 1, pageSize = 20) {
  const items = [];
  for (const inst of INVIDIOUS) {
    try {
      const data = await fetchJSON(`${inst}/api/v1/search?q=${enc(query)}&type=video&page=${page - 1}`, { timeout: 8000 });
      for (const v of (data || []).slice(0, pageSize)) {
        const vid = v.videoId || '';
        let thumb = '';
        for (const t of (v.videoThumbnails || [])) if (t.quality === 'medium') { thumb = t.url; break; }
        if (!thumb && v.videoThumbnails?.length) thumb = v.videoThumbnails[0].url;
        if (thumb && !thumb.startsWith('http')) thumb = inst + thumb;
        items.push({ id: vid, title: v.title || '', description: (v.description || '').substring(0, 200), thumbnail: thumb, url: `https://www.youtube.com/watch?v=${vid}`, source: 'youtube', source_name: 'YouTube', duration: formatSeconds(v.lengthSeconds), duration_sec: v.lengthSeconds || 0, author: v.author || '', play_count: v.viewCount || 0, publish_time: v.publishedText || '', type: 'video' });
      }
      if (items.length) break;
    } catch {}
  }
  return items;
}

async function searchDailymotion(query, page = 1, pageSize = 20) {
  const items = [];
  try {
    const data = await fetchJSON(`https://api.dailymotion.com/videos?search=${enc(query)}&page=${page}&limit=${Math.min(pageSize, 30)}&fields=id,title,description,thumbnail_480_url,duration,url,owner.screenname,views_total,created_time&sort=relevance`);
    for (const v of (data?.list || [])) {
      items.push({ id: v.id || '', title: v.title || '', description: (v.description || '').substring(0, 200), thumbnail: v.thumbnail_480_url || '', url: v.url || `https://www.dailymotion.com/video/${v.id}`, source: 'dailymotion', source_name: 'Dailymotion', duration: formatSeconds(v.duration), duration_sec: v.duration || 0, author: v.owner?.screenname || '', play_count: v.views_total || 0, publish_time: String(v.created_time || ''), type: 'video' });
    }
  } catch (e) { console.error('[dailymotion]', e.message); }
  return items;
}

async function searchArchive(query, page = 1, pageSize = 20) {
  const items = [];
  try {
    const data = await fetchJSON(`https://archive.org/advancedsearch.php?q=mediatype%3Amovies+AND+(${enc(query)})&fl[]=identifier&fl[]=title&fl[]=description&fl[]=downloads&fl[]=avg_rating&fl[]=publicdate&fl[]=creator&sort[]=downloads+desc&rows=${Math.min(pageSize, 30)}&page=${page}&output=json`);
    for (const doc of (data?.response?.docs || [])) {
      const id = doc.identifier || '';
      items.push({ id, title: doc.title || '', description: (doc.description || '').substring(0, 200), thumbnail: `https://archive.org/services/img/${id}`, url: `https://archive.org/details/${id}`, source: 'archive', source_name: 'Internet Archive', author: doc.creator || '', play_count: doc.downloads || 0, publish_time: doc.publicdate || '', type: 'video', extra: { avg_rating: doc.avg_rating } });
    }
  } catch (e) { console.error('[archive]', e.message); }
  return items;
}

async function searchPeerTube(query, page = 1, pageSize = 20) {
  const items = [];
  try {
    const data = await fetchJSON(`https://sepiasearch.org/api/v1/search/videos?search=${enc(query)}&start=${(page - 1) * pageSize}&count=${Math.min(pageSize, 30)}&sort=-match`);
    for (const v of (data?.data || [])) {
      const thumbs = v.thumbnails || [];
      items.push({ id: v.uuid || '', title: v.name || '', description: (v.description || '').substring(0, 200), thumbnail: thumbs.length ? thumbs[0].url : '', url: v.url || '', source: 'peertube', source_name: `PeerTube (${v.account?.host || '联邦'})`, duration: formatSeconds(v.duration), duration_sec: v.duration || 0, author: v.account?.displayName || '', play_count: v.views || 0, publish_time: v.publishedAt || '', tags: (v.tags || []).map(t => t.label || t).filter(Boolean), type: 'video' });
    }
  } catch (e) { console.error('[peertube]', e.message); }
  return items;
}

async function searchOdysee(query) {
  const items = [];
  try {
    const data = await fetchJSON(`https://lighthouse.lbry.com/search?s=${enc(query)}&mediaType=video&size=20`);
    if (Array.isArray(data)) {
      for (const v of data) {
        items.push({ id: v.claimId || '', title: v.title || '', description: (v.description || '').substring(0, 200), thumbnail: v.thumbnail || '', url: `https://odysee.com/${v.claimId}`, source: 'odysee', source_name: 'Odysee', duration: formatSeconds(v.duration), duration_sec: v.duration || 0, author: v.channel || '', play_count: 0, type: 'video' });
      }
    }
  } catch {}
  if (!items.length) items.push(linkItem({ title: `${query} - Odysee`, desc: '在Odysee搜索去中心化视频', url: `https://odysee.com/$/search?q=${enc(query)}`, source: 'odysee', sourceName: 'Odysee' }));
  return items;
}

async function searchVimeo(query, page = 1, pageSize = 20) {
  const items = [];
  const token = process.env.VIMEO_API_KEY || '';
  if (token) {
    try {
      const data = await fetchJSON(`https://api.vimeo.com/videos?query=${enc(query)}&page=${page}&per_page=${Math.min(pageSize, 20)}&sort=relevant`, { headers: { Authorization: `Bearer ${token}` } });
      for (const v of (data?.data || [])) {
        const pics = v.pictures?.sizes || [];
        items.push({ id: v.uri?.split('/').pop() || '', title: v.name || '', description: (v.description || '').substring(0, 200), thumbnail: pics.length ? pics[pics.length - 1].link : '', url: v.link || '', source: 'vimeo', source_name: 'Vimeo', duration: formatSeconds(v.duration), duration_sec: v.duration || 0, author: v.user?.name || '', play_count: v.stats?.plays || 0, publish_time: v.release_time || '', type: 'video' });
      }
    } catch {}
  }
  if (!items.length) items.push(linkItem({ title: `${query} - Vimeo`, desc: '在Vimeo搜索高清创意视频', url: `https://vimeo.com/search?q=${enc(query)}`, source: 'vimeo', sourceName: 'Vimeo' }));
  return items;
}

// Search-link-only sources
const SEARCH_LINKS = {
  rumble: { name: 'Rumble', icon: '📢', url: q => `https://rumble.com/search/video?q=${enc(q)}`, desc: '在Rumble搜索视频' },
  twitch: { name: 'Twitch', icon: '💜', url: q => `https://www.twitch.tv/search?term=${enc(q)}`, desc: '搜索直播回放和剪辑' },
  ted: { name: 'TED', icon: '🎓', url: q => `https://www.ted.com/search?q=${enc(q)}&type=talks`, desc: '搜索TED演讲' },
  douyin: { name: '抖音', icon: '🎵', url: q => `https://www.douyin.com/search/${enc(q)}?type=video`, desc: '搜索抖音短视频' },
  kuaishou: { name: '快手', icon: '⚡', url: q => `https://www.kuaishou.com/search/video?searchKey=${enc(q)}`, desc: '搜索快手短视频' },
  xigua: { name: '西瓜视频', icon: '🍉', url: q => `https://www.ixigua.com/search/${enc(q)}?type=video`, desc: '搜索西瓜视频' },
  haokan: { name: '好看视频', icon: '👍', url: q => `https://haokan.baidu.com/web/search?query=${enc(q)}&type=video`, desc: '搜索好看视频' },
  weibo: { name: '微博', icon: '🔴', url: q => `https://s.weibo.com/video?q=${enc(q)}`, desc: '搜索微博视频' },
  xiaohongshu: { name: '小红书', icon: '📕', url: q => `https://www.xiaohongshu.com/search_result?keyword=${enc(q)}&type=video`, desc: '搜索小红书视频笔记' },
  acfun: { name: 'AcFun', icon: '🅰️', url: q => `https://www.acfun.cn/search?keyword=${enc(q)}`, desc: '搜索AcFun弹幕视频' },
  douban: { name: '豆瓣', icon: '📗', url: q => `https://search.douban.com/movie/search?search_text=${enc(q)}`, desc: '搜索豆瓣影视评分' },
  crunchyroll: { name: 'Crunchyroll', icon: '🍥', url: q => `https://www.crunchyroll.com/search?q=${enc(q)}`, desc: '搜索正版日本动漫' },
  mal: { name: 'MyAnimeList', icon: '📋', url: q => `https://myanimelist.net/anime.php?q=${enc(q)}&cat=anime`, desc: '搜索动漫数据库' },
  niconico: { name: 'Niconico', icon: '🐱', url: q => `https://www.nicovideo.jp/search/${enc(q)}`, desc: '搜索日本动画视频' },
  dmhy: { name: '动漫花园', icon: '🌸', url: q => `https://share.dmhy.org/topics/list?keyword=${enc(q)}`, desc: '搜索动漫BT资源' },
  age: { name: 'AGE动漫', icon: '🔮', url: q => `https://www.agemys.org/search?query=${enc(q)}`, desc: '搜索在线动漫' },
  yhdmm: { name: '樱花动漫', icon: '🌸', url: q => `https://www.yhdmm.net/search/${enc(q)}`, desc: '搜索在线动漫' },
  imdb: { name: 'IMDB', icon: '🏆', url: q => `https://www.imdb.com/find?q=${enc(q)}&s=tt&ttype=ft`, desc: '搜索全球影视信息' },
  tubi: { name: 'Tubi', icon: '📺', url: q => `https://tubitv.com/search/${enc(q)}`, desc: '搜索免费影视' },
  pluto: { name: 'Pluto TV', icon: '🪐', url: q => `https://pluto.tv/search?query=${enc(q)}`, desc: '搜索免费流媒体' },
  plex: { name: 'Plex', icon: '📽️', url: q => `https://www.plex.tv/search/?query=${enc(q)}`, desc: '搜索免费影视' },
  kanopy: { name: 'Kanopy', icon: '📚', url: q => `https://www.kanopy.com/search?q=${enc(q)}`, desc: '搜索免费纪录片' },
  openculture: { name: 'Open Culture', icon: '🎭', url: q => `https://www.openculture.com/free_movies_online`, desc: '免费在线电影' },
  cupfox: { name: '茶杯狐', icon: '☕', url: q => `https://www.cupfox.app/search?key=${enc(q)}`, desc: '聚合搜索全网影视' },
  ddys: { name: '低端影视', icon: '🎬', url: q => `https://ddys.pro/?s=${enc(q)}`, desc: '搜索高清影视资源' },
  libvio: { name: 'LIBVIO', icon: '🎥', url: q => `https://www.libvio.me/search/${enc(q)}`, desc: '搜索高清影视资源' },
  zxzj: { name: '在线之家', icon: '🏠', url: q => `https://www.zxzj.me/?s=${enc(q)}`, desc: '搜索影视资源' },
  dsxys: { name: '大师兄', icon: '🐵', url: q => `https://dsxys.com/search/${enc(q)}`, desc: '搜索影视资源' },
  bde4: { name: '哔嘀影视', icon: '🔹', url: q => `https://www.bde4.cc/search/${enc(q)}`, desc: '搜索影视资源' },
};

function makeSearchLink(key, query) {
  const s = SEARCH_LINKS[key];
  if (!s) return null;
  return linkItem({ title: `${query} - ${s.name}`, desc: s.desc, url: s.url(query), source: key, sourceName: s.name });
}

// API key sources
async function searchPixabay(query, page = 1, pageSize = 20) {
  const apiKey = process.env.PIXABAY_API_KEY || '';
  if (!apiKey) return [makeSearchLink('pixabay', query) || linkItem({ title: `${query} - Pixabay`, desc: '搜索免费视频素材', url: `https://pixabay.com/videos/search/${enc(query)}/`, source: 'pixabay', sourceName: 'Pixabay' })];
  try {
    const data = await fetchJSON(`https://pixabay.com/api/videos/?key=${apiKey}&q=${enc(query)}&page=${page}&per_page=${Math.min(pageSize, 20)}`);
    return (data?.hits || []).map(v => ({ id: String(v.id), title: v.tags || '', description: `Pixabay免费视频`, thumbnail: v.pictureId ? `https://i.vimeocdn.com/video/${v.pictureId}_640x360.jpg` : '', url: v.pageURL || '', source: 'pixabay', source_name: 'Pixabay', author: v.user || '', play_count: v.views || 0, type: 'video', extra: { license: 'Pixabay License' } }));
  } catch { return []; }
}

async function searchPexels(query, page = 1, pageSize = 20) {
  const apiKey = process.env.PEXELS_API_KEY || '';
  if (!apiKey) return [makeSearchLink('pexels', query) || linkItem({ title: `${query} - Pexels`, desc: '搜索免费视频素材', url: `https://www.pexels.com/search/videos/${enc(query)}/`, source: 'pexels', sourceName: 'Pexels' })];
  try {
    const data = await fetchJSON(`https://api.pexels.com/videos/search?query=${enc(query)}&page=${page}&per_page=${Math.min(pageSize, 20)}`, { headers: { Authorization: apiKey } });
    return (data?.videos || []).map(v => ({ id: String(v.id), title: `Pexels Video ${v.id}`, description: `Pexels免费视频`, thumbnail: v.image || '', url: v.url || '', source: 'pexels', source_name: 'Pexels', duration: formatSeconds(v.duration), duration_sec: v.duration || 0, author: v.user?.name || '', type: 'video', extra: { license: 'Pexels License' } }));
  } catch { return []; }
}

async function searchTMDB(query, page = 1) {
  const apiKey = process.env.TMDB_API_KEY || '';
  if (!apiKey) return [linkItem({ title: `${query} - TMDB`, desc: '搜索影视详情和评分', url: `https://www.themoviedb.org/search?query=${enc(query)}`, source: 'openmovie', sourceName: 'TMDB' })];
  try {
    const data = await fetchJSON(`https://api.themoviedb.org/3/search/multi?query=${enc(query)}&page=${page}&language=zh-CN&api_key=${apiKey}`);
    return (data?.results || []).map(r => {
      const mt = r.media_type || 'movie';
      return { id: `tmdb-${r.id}`, title: r.title || r.name || '', description: (r.overview || '').substring(0, 200), thumbnail: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '', url: `https://www.themoviedb.org/${mt === 'tv' ? 'tv' : 'movie'}/${r.id}`, source: 'openmovie', source_name: 'TMDB', publish_time: r.release_date || r.first_air_date || '', type: mt === 'tv' ? 'tv' : 'movie', extra: { vote_average: r.vote_average } };
    });
  } catch { return []; }
}

async function searchOMDB(query) {
  const apiKey = process.env.OMDB_API_KEY || '';
  if (!apiKey) return [linkItem({ title: `${query} - OMDB`, desc: '搜索电影详情', url: `https://www.imdb.com/find?q=${enc(query)}&s=tt`, source: 'omdb', sourceName: 'OMDB' })];
  try {
    const data = await fetchJSON(`https://www.omdbapi.com/?s=${enc(query)}&apikey=${apiKey}`);
    return (data?.Search || []).map(v => ({ id: v.imdbID || '', title: v.Title || '', description: `${v.Year || ''} · ${v.Type || ''}`, thumbnail: v.Poster !== 'N/A' ? v.Poster : '', url: `https://www.imdb.com/title/${v.imdbID}/`, source: 'omdb', source_name: 'OMDB', publish_time: v.Year || '', type: v.Type === 'series' ? 'tv' : 'movie' }));
  } catch { return []; }
}

// ══════════════════════════════════════════════════════════════════════════════
//  SOURCE MAP
// ══════════════════════════════════════════════════════════════════════════════

const SOURCE_MAP = {
  bilibili: { fn: searchBilibili, name: 'B站', group: 'free', icon: '📺' },
  youtube: { fn: searchYouTube, name: 'YouTube', group: 'free', icon: '▶️' },
  dailymotion: { fn: searchDailymotion, name: 'Dailymotion', group: 'free', icon: '🔵' },
  archive: { fn: searchArchive, name: 'Internet Archive', group: 'free', icon: '🏛️' },
  peertube: { fn: searchPeerTube, name: 'PeerTube', group: 'free', icon: '🌐' },
  odysee: { fn: searchOdysee, name: 'Odysee', group: 'free', icon: '🔮' },
  pixabay: { fn: searchPixabay, name: 'Pixabay', group: 'apikey', icon: '🎨', key: 'PIXABAY_API_KEY' },
  pexels: { fn: searchPexels, name: 'Pexels', group: 'apikey', icon: '📸', key: 'PEXELS_API_KEY' },
  openmovie: { fn: searchTMDB, name: 'TMDB', group: 'apikey', icon: '🎬', key: 'TMDB_API_KEY' },
  omdb: { fn: searchOMDB, name: 'OMDB', group: 'apikey', icon: '🎥', key: 'OMDB_API_KEY' },
  vimeo: { fn: searchVimeo, name: 'Vimeo', group: 'apikey', icon: '🎞️', key: 'VIMEO_API_KEY' },
  ...Object.fromEntries(Object.keys(SEARCH_LINKS).map(k => [k, { fn: (q, p, ps) => Promise.resolve([makeSearchLink(k, q)]), name: SEARCH_LINKS[k].name, group: 'link', icon: SEARCH_LINKS[k].icon }])),
};

const CAT_SUFFIX = { movie: ' 电影', tv: ' 电视剧', anime: ' 动漫', variety: ' 综艺', docu: ' 纪录片', short: ' 短视频', music: ' MV' };

async function searchAll(query, category = 'all', page = 1, pageSize = 20, sources = null) {
  const start = Date.now();
  const searchQuery = query + (CAT_SUFFIX[category] || '');
  const activeSources = sources || Object.keys(SOURCE_MAP);
  const tasks = activeSources.map(src => { const e = SOURCE_MAP[src]; return e ? e.fn(searchQuery, page, pageSize) : Promise.resolve([]); });
  const results = await Promise.allSettled(tasks);
  let allItems = []; const searched = [];
  results.forEach((r, i) => {
    const srcName = activeSources[i];
    if (r.status === 'fulfilled' && Array.isArray(r.value)) { allItems = allItems.concat(r.value); if (r.value.length > 0) searched.push(srcName); }
  });
  const seen = new Set(); const unique = [];
  for (const item of allItems) { const key = item.title.toLowerCase().replace(/\s+/g, ''); if (key && !seen.has(key)) { seen.add(key); unique.push(item); } }
  return { query, category, page, page_size: pageSize, total: unique.length, items: unique, sources_searched: searched, elapsed_ms: Date.now() - start };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'tv.html')));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));
app.get('/sources', (req, res) => {
  const sources = Object.entries(SOURCE_MAP).map(([id, v]) => ({ id, name: v.name, group: v.group, icon: v.icon, needsKey: !!v.key, envKey: v.key || null }));
  res.json({ total: sources.length, sources, categories: [{ id: 'all', name: '全部' }, { id: 'movie', name: '电影' }, { id: 'tv', name: '电视剧' }, { id: 'anime', name: '动漫' }, { id: 'variety', name: '综艺' }, { id: 'docu', name: '纪录片' }, { id: 'short', name: '短视频' }, { id: 'music', name: 'MV' }] });
});
app.get('/search', async (req, res) => {
  try {
    const { q, cat = 'all', page = 1, page_size = 20, sources: srcParam } = req.query;
    if (!q?.trim()) return res.status(400).json({ error: '缺少搜索关键词 q' });
    let srcList = null;
    if (srcParam) { srcList = srcParam.split(',').map(s => s.trim()).filter(s => SOURCE_MAP[s]); if (!srcList.length) return res.status(400).json({ error: '无效的 sources 参数' }); }
    res.json(await searchAll(q.trim(), cat, Math.max(1, +page), Math.min(50, Math.max(1, +page_size)), srcList));
  } catch (e) { console.error('[search]', e); res.status(500).json({ error: e.message }); }
});
app.get('/trending', (req, res) => {
  const { category = 'all' } = req.query;
  let items = [
    { title: '流浪地球3', type: 'movie', year: '2026', rating: '9.2', emoji: '🚀' },
    { title: '三体 第三季', type: 'tv', year: '2026', rating: '9.5', emoji: '🌌' },
    { title: '哪吒之魔童闹海', type: 'movie', year: '2025', rating: '8.9', emoji: '🔥' },
    { title: '庆余年3', type: 'tv', year: '2026', rating: '8.7', emoji: '⚔️' },
    { title: '鬼灭之刃 无限城篇', type: 'anime', year: '2025', rating: '9.3', emoji: '🗡️' },
    { title: '漫长的季节2', type: 'tv', year: '2026', rating: '9.1', emoji: '🚂' },
    { title: '封神第三部', type: 'movie', year: '2026', rating: '8.5', emoji: '🏛️' },
    { title: '间谍过家家 剧场版', type: 'anime', year: '2025', rating: '8.8', emoji: '🕵️' },
    { title: '蓝色星球3', type: 'docu', year: '2026', rating: '9.7', emoji: '🌊' },
    { title: '歌手2026', type: 'variety', year: '2026', rating: '8.6', emoji: '🎤' },
    { title: '黑神话·悟空 DLC', type: 'game', year: '2026', rating: '9.0', emoji: '🐒' },
    { title: '奔跑吧 2026', type: 'variety', year: '2026', rating: '7.8', emoji: '🏃' },
  ];
  if (category !== 'all') items = items.filter(t => t.type === category);
  res.json({ items });
});

app.listen(PORT, '0.0.0.0', () => {
  const keys = Object.values(SOURCE_MAP).filter(v => v.key).map(v => v.key);
  console.log(`\n🎬 全网视频搜索 TV Edition v3.0`);
  console.log(`📡 http://0.0.0.0:${PORT}`);
  console.log(`📺 电视端: http://你的IP:${PORT}`);
  console.log(`📊 ${Object.keys(SOURCE_MAP).length} 个平台`);
  console.log(`💡 可选API Key: ${keys.join(', ')}\n`);
});
