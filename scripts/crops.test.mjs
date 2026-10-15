import test from 'node:test';
import assert from 'node:assert/strict';
import { cropRect, scaleFactor } from './crops.mjs';

test('off-center portrait focal point preserves the chosen side without crossing bounds', () => {
  const crop = cropRect({ width: 3840, height: 2160 }, { width: 1080, height: 2340 }, { focal: [0.9, 0.5] });
  assert.equal(crop.left + crop.width, 3840);
  assert.equal(crop.height, 2160);
  assert.ok(scaleFactor(crop, { width: 1080, height: 2340 }) > 1);
});
test('invalid explicit crops cannot silently stretch or leave the source', () => {
  assert.throws(() => cropRect({ width: 1000, height: 1000 }, { width: 16, height: 9 }, { rect: { left: 0, top: 0, width: 900, height: 900 } }), /aspect/);
  assert.throws(() => cropRect({ width: 1000, height: 1000 }, { width: 1, height: 1 }, { rect: { left: 500, top: 0, width: 600, height: 600 } }), /outside/);
});
test('native 16:9 source remains uncropped', () => {
  assert.deepEqual(cropRect({ width: 3840, height: 2160 }, { width: 3840, height: 2160 }), { left: 0, top: 0, width: 3840, height: 2160 });
});
