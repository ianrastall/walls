/** A focal point locates the visual center of a crop in normalized source coordinates. */
export function cropRect(source, target, setting = {}) {
  const { width: sw, height: sh } = source;
  const { width: tw, height: th } = target;
  if (![sw, sh, tw, th].every(v => Number.isInteger(v) && v > 0)) throw new Error('Invalid image dimensions');
  let rect;
  if (setting.rect) {
    rect = { ...setting.rect };
    const { left, top, width, height } = rect;
    if (![left, top, width, height].every(Number.isInteger) || left < 0 || top < 0 || width < 1 || height < 1 || left + width > sw || top + height > sh) throw new Error('Crop rectangle is outside the source');
    // One source-pixel rounding tolerance; never reshape an arbitrary rectangle.
    if (Math.abs(width - height * tw / th) > 1) throw new Error('Crop rectangle must match the target aspect ratio');
  } else {
    const [fx, fy] = setting.focal ?? [0.5, 0.5];
    if (![fx, fy].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error('Focal point must be in [0,1]');
    const width = Math.min(sw, Math.round(sh * tw / th));
    const height = Math.min(sh, Math.round(sw * th / tw));
    rect = { left: Math.max(0, Math.min(sw - width, Math.round(fx * sw - width / 2))), top: Math.max(0, Math.min(sh - height, Math.round(fy * sh - height / 2))), width, height };
  }
  return rect;
}

export function scaleFactor(rect, target) {
  return Math.max(target.width / rect.width, target.height / rect.height);
}
