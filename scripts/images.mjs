import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cropRect, scaleFactor } from './crops.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const hash = value => createHash('sha256').update(value).digest('hex');
const json = file => readFile(file, 'utf8').then(JSON.parse);
const presets = await json('config/presets.json');
const pipelineHash = hash(await readFile(fileURLToPath(import.meta.url)) + await readFile('scripts/crops.mjs') + JSON.stringify(sharp.versions));
const manifest = [];
let written = 0;
async function save(file, data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  try { if ((await readFile(file)).equals(buffer)) return; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  written++;
}
const png = image => image.withIccProfile('srgb').png({ compressionLevel: 9, adaptiveFiltering: true, palette: false });
const webp = image => image.withIccProfile('srgb').webp({ quality: 80, effort: 5 });
const normalized = file => sharp(file).rotate().toColourspace('srgb');
const htmlEscape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

for (const file of (await readdir('artworks')).filter(f => f.endsWith('.json')).sort()) {
  const art = await json(`artworks/${file}`);
  if (art.status !== 'published') continue;
  if (!/^[a-z0-9-]+$/.test(art.slug)) throw new Error(`Invalid slug in ${file}`);
  const sourceInfo = {};
  for (const [key, source] of Object.entries(art.sources)) {
    if (!source.file.startsWith('assets/masters/') || source.file.includes('..')) throw new Error('Sources must be inside assets/masters');
    const buffer = await readFile(source.file);
    const meta = await sharp(buffer).metadata();
    if (meta.orientation && meta.orientation !== 1) throw new Error('Use an explicitly oriented master before setting crops');
    if (meta.width !== source.width || meta.height !== source.height) throw new Error(`${source.file}: dimensions differ from the metadata record`);
    sourceInfo[key] = { ...source, sha256: hash(buffer), bytes: buffer.length, detectedSpace: meta.space };
  }
  const signature = hash(JSON.stringify({ art, sourceInfo, presets, pipelineHash }));
  const cacheFile = `.cache/${art.slug}.json`;
  let cache;
  try { cache = await json(cacheFile); } catch {}
  if (cache?.signature === signature) {
    const intact = (await Promise.all(cache.files.map(async ({ file, sha256 }) => {
      try { return hash(await readFile(file)) === sha256; } catch { return false; }
    }))).every(Boolean);
    if (intact) { manifest.push(cache.art); console.log(`Unchanged: ${art.title}`); continue; }
  }
  const outputs = [];
  async function output(relative, buffer) {
    const file = `public/${relative}`;
    await save(file, buffer);
    outputs.push({ file, sha256: hash(buffer) });
    return relative;
  }
  const previews = {};
  for (const [format, sourceKey] of Object.entries(art.masterVariants)) {
    const source = sourceInfo[sourceKey];
    previews[format] = [];
    const widths = format === 'portrait' ? [420, 840] : [480, 960, 1600];
    for (const width of [...new Set(widths.map(w => Math.min(w, source.width)))]) {
      const { data, info } = await webp(normalized(source.file).resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })).toBuffer({ resolveWithObject: true });
      const url = await output(`generated/${art.slug}/${format}-${width}.webp`, data);
      previews[format].push({ url, width: info.width, height: info.height, bytes: data.length });
    }
  }
  const downloads = [], unavailable = [];
  for (const id of art.downloads.presets) {
    const preset = presets.find(p => p.id === id);
    if (!preset) throw new Error(`Unknown preset ${id}`);
    const setting = art.crops[preset.aspect];
    if (!setting) throw new Error(`${art.slug}: explicit crop decision required for ${preset.aspect}`);
    const source = sourceInfo[setting.source];
    if (!source) throw new Error(`${art.slug}: unknown source ${setting.source}`);
    const crop = cropRect(source, preset, setting);
    const scale = scaleFactor(crop, preset);
    const upscaled = scale > 1;
    const upscaleReason = art.downloads.allowUpscale?.[id] ?? null;
    if (upscaled && !upscaleReason) {
      if (preset.required) throw new Error(`${art.slug}/${id}: required output needs explicit upscale authorization in metadata`);
      unavailable.push({ ...preset, reason: 'Source resolution is too small; upscaling is disabled.' });
      continue;
    }
    const pipeline = normalized(source.file).extract(crop).resize(preset.width, preset.height, { fit: 'cover', kernel: 'lanczos3', withoutEnlargement: !upscaled });
    const buffer = await png(pipeline).toBuffer();
    const url = await output(`generated/${art.slug}/${art.slug}-${preset.width}x${preset.height}.png`, buffer);
    const { data, info } = await webp(normalized(source.file).extract(crop).resize({ width: Math.min(960, crop.width), height: 1000, fit: 'inside', kernel: 'lanczos3', withoutEnlargement: true })).toBuffer({ resolveWithObject: true });
    const preview = await output(`generated/${art.slug}/crop-${id}.webp`, data);
    downloads.push({ ...preset, url, preview, previewWidth: info.width, previewHeight: info.height, source: setting.source, alt: source.alt ?? art.alt, compositionLabel: source.label ?? (preset.composition === 'portrait' ? 'Original portrait' : 'Landscape composition'), crop, upscaled, upscaleFactor: Number(scale.toFixed(4)), upscaleReason, bytes: buffer.length, sha256: hash(buffer) });
  }
  const landscape = sourceInfo[art.masterVariants.landscape];
  const social = await output(`generated/${art.slug}/social.jpg`, await normalized(landscape.file).resize(1200, 630, { fit: 'cover', position: 'centre', kernel: 'lanczos3' }).withIccProfile('srgb').jpeg({ quality: 84, mozjpeg: true }).toBuffer());
  const result = { ...art, sources: sourceInfo, previews, downloads, unavailable, social };
  await save(cacheFile, JSON.stringify({ signature, files: outputs, art: result }, null, 2) + '\n');
  manifest.push(result);
  console.log(`Prepared: ${art.title} (${downloads.length} downloads)`);
}
manifest.sort((a, b) => a.order - b.order);
await save('src/generated/artworks.json', JSON.stringify(manifest, null, 2) + '\n');
const review = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Walls · Crop review</title><style>body{background:#141617;color:#eee;font:16px system-ui;margin:40px}h1,h2{font-family:Georgia,serif}section{margin:50px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:24px}figure{margin:0}img{width:100%;height:280px;object-fit:contain;background:#0b0d0e}figcaption{padding:12px 0;line-height:1.5}small{color:#c2c5c1}</style><h1>Walls · Crop review</h1><p>Exact selected crops. Images are fitted inside each review cell; they are never stretched.</p>${manifest.map(a=>`<section><h2>${htmlEscape(a.title)}</h2><div class="grid">${a.downloads.map(d=>`<figure><img src="../public/${d.preview}" alt="${htmlEscape(a.alt)}"><figcaption>${htmlEscape(d.label)} · ${d.width} × ${d.height}<br><small>${htmlEscape(d.source)} source · ${d.upscaled ? `enlarged ${d.upscaleFactor}×` : 'no enlargement'}</small></figcaption></figure>`).join('')}</div></section>`).join('')}</html>`;
await save('review/index.html', review);
// A compact, reproducible sheet for reviewing every crop without opening the site.
if (manifest.length) {
  const cellWidth = 330, cellHeight = 250, columns = 4;
  const rowsPerArt = manifest.map(a => Math.ceil(a.downloads.length / columns));
  const totalRows = rowsPerArt.reduce((a,b)=>a+b,0);
  const layers = [];
  let rowOffset = 0;
  for (const art of manifest) {
    for (let i = 0; i < art.downloads.length; i++) {
      const d = art.downloads[i];
      const left = (i % columns) * cellWidth, top = (rowOffset + Math.floor(i / columns)) * cellHeight;
      const thumbnail = await sharp(`public/${d.preview}`).resize(cellWidth - 16, cellHeight - 54, { fit: 'contain', background: '#171a18', withoutEnlargement: true }).webp().toBuffer();
      layers.push({ input: thumbnail, left: left + 8, top });
      const label = `<svg width="330" height="48"><rect width="330" height="48" fill="#171a18"/><text x="8" y="17" font-family="sans-serif" font-size="12" fill="#eeeae1">${htmlEscape(art.title.slice(0,42))}</text><text x="8" y="36" font-family="sans-serif" font-size="11" fill="#bfc3bb">${htmlEscape(d.label)} · ${d.width}×${d.height}${d.upscaled ? ' · enlarged' : ''}</text></svg>`;
      layers.push({ input: Buffer.from(label), left, top: top + cellHeight - 50 });
    }
    rowOffset += Math.ceil(art.downloads.length / columns);
  }
  await save('review/contact-sheet.webp', await sharp({ create: { width: columns * cellWidth, height: totalRows * cellHeight, channels: 3, background: '#171a18' } }).composite(layers).webp({quality:88}).toBuffer());
}
const sourceBytes = manifest.reduce((sum,a) => sum + Object.values(a.sources).reduce((n,s)=>n+s.bytes,0),0);
const pngBytes = manifest.reduce((sum,a) => sum+a.downloads.reduce((n,d)=>n+d.bytes,0),0);
await save('review/asset-report.json', JSON.stringify({ sourceBytes, pngBytes, artworkCount: manifest.length, downloads: manifest.flatMap(a=>a.downloads.map(d=>({artwork:a.slug,preset:d.id,width:d.width,height:d.height,bytes:d.bytes,upscaled:d.upscaled,scale:d.upscaleFactor}))) },null,2)+'\n');
console.log(`${written} files written; sources ${(sourceBytes/1024/1024).toFixed(1)} MiB; PNG downloads ${(pngBytes/1024/1024).toFixed(1)} MiB.`);
