import { readFile, readdir, stat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import jsQR from 'jsqr';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const artworks = JSON.parse(await readFile('src/generated/artworks.json', 'utf8'));
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir,e.name)) : path.join(dir,e.name)))).flat();
}
let downloads = 0, links = 0;
for (const art of artworks) {
  for (const source of Object.values(art.sources)) assert.equal(sha(await readFile(source.file)), source.sha256, 'Source changed after generation');
  for (const [id, dimensions] of Object.entries({ phone: [1080,2340], desktop: [3840,2160] })) {
    const download = art.downloads.find(d=>d.id===id);
    assert.ok(download, `${art.slug}: missing ${id}`);
    assert.deepEqual([download.width,download.height],dimensions);
  }
  for (const d of art.downloads) {
    const buffer = await readFile(`dist/${d.url}`);
    const m = await sharp(buffer).metadata();
    assert.equal(m.format, 'png');
    assert.deepEqual([m.width,m.height],[d.width,d.height], `${art.slug}/${d.id}: dimension mismatch`);
    assert.equal(m.space, 'srgb');
    assert.ok(m.icc, 'Download must contain its sRGB profile');
    assert.equal(sha(buffer),d.sha256);
    if (d.upscaled) assert.ok(d.upscaleReason, 'Upscaling requires an explicit reason');
    downloads++;
  }
  for (const previews of Object.values(art.previews)) for (const preview of previews) {
    assert.ok(preview.bytes < 900_000, 'Preview exceeds the 900 KB budget');
    assert.equal((await sharp(`dist/${preview.url}`).metadata()).format,'webp');
  }
}
const all = await files('dist');
for (const file of all.filter(f=>f.endsWith('.html'))) {
  const html = await readFile(file,'utf8');
  assert.ok(html.includes('lang="en"'));
  assert.ok(html.includes('name="description"'));
  assert.ok(!/<img\b[^>]*src="[^"]+\.png"/i.test(html), 'Full PNG must never be an inline gallery image');
  if (html.includes('data-phone-qr')) {
    const qrData = html.match(/data-phone-qr[^>]*src="data:image\/png;base64,([^"]+)"/)?.[1];
    assert.ok(qrData, 'Phone QR image must be embedded locally');
    const { data, info } = await sharp(Buffer.from(qrData, 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    assert.ok(decoded, `${file}: phone QR code cannot be decoded`);
    const phonePath = html.match(/data-phone-download[^>]*href="([^"]+)"/)?.[1];
    assert.ok(phonePath, 'Phone QR must have an accessible download alternative');
    assert.equal(decoded.data, new URL(phonePath, 'https://ianrastall.github.io').href, 'QR must open the same phone image as the download button');
    const small = await sharp(Buffer.from(qrData, 'base64')).resize(280, 280, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer();
    assert.equal(jsQR(new Uint8ClampedArray(small), 280, 280)?.data, decoded.data, 'QR must also decode at its narrow-phone display size');
    const slug = file.split(path.sep).at(-2);
    const phone = artworks.find(a => a.slug === slug)?.downloads.find(d => d.id === 'phone');
    assert.ok(phone && phonePath.startsWith(`/walls/${phone.url}?v=`), 'QR and shortcut must target this artwork’s phone PNG');
  }
  const refs = [...html.matchAll(/(?:href|src|data-preview)="([^"]+)"/g)].map(m=>m[1]);
  for (const match of html.matchAll(/srcset="([^"]+)"/g)) refs.push(...match[1].split(',').map(s=>s.trim().split(/\s+/)[0]));
  for (const ref of refs) {
    if (/^(https?:|data:|mailto:|#)/.test(ref)) continue;
    assert.ok(ref.startsWith('/walls/'), `${file}: missing base in ${ref}`);
    let relative = decodeURIComponent(ref.slice('/walls/'.length).split(/[?#]/)[0]);
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    await access(path.join('dist',relative));
    links++;
  }
}
const bytes = (await Promise.all(all.map(f=>stat(f).then(s=>s.size)))).reduce((a,b)=>a+b,0);
assert.ok(bytes < 1_000_000_000,'Site exceeds the GitHub Pages 1 GB limit');
console.log(`Verified ${downloads} PNG downloads, ${links} local URL references, ${all.filter(f=>f.endsWith('.html')).length} pages; build ${(bytes/1024/1024).toFixed(1)} MiB.`);
