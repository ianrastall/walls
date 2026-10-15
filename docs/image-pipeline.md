# Image pipeline

Run `npm run images` from the repository root. Only Sharp and Node built-ins are used. Source masters are never written to by the pipeline.

## Presets

| ID | Pixels | Aspect | Source | Reason |
| --- | --- | --- | --- | --- |
| phone | 1080 × 2340 | 6:13 | Original portrait | Ian's required phone dimensions |
| desktop | 3840 × 2160 | 16:9 | Landscape adaptation | Ian's required desktop dimensions |
| phone-9-16 | 720 × 1280 | 9:16 | Original portrait | A less elongated phone format |
| tablet | 1024 × 768 | 4:3 | Landscape adaptation | A common tablet aspect ratio |
| desktop-hd | 1600 × 900 | 16:9 | Landscape adaptation | A smaller desktop output without enlargement |
| desktop-16-10 | 1440 × 900 | 16:10 | Landscape adaptation | A common laptop/desktop aspect ratio |
| ultrawide | 1536 × 648 | 64:27 | Landscape adaptation | Same ratio as 2560 × 1080, at a source-safe resolution |

The presets cover useful *shapes*, not a claimed percentage of devices. Optional resolutions are deliberately modest because the current sources are small. The ultrawide file is not a full-resolution 2560 × 1080 or 3440 × 1440 file. Add those only with a sufficiently large source or a documented, intentional enlargement. Do not introduce dozens of duplicate device-name presets.

## Crop control

Every enabled aspect needs an explicit entry in the artwork's `crops` object. A focal point is in normalized source coordinates: `[0,0]` is the top left, `[1,1]` is the bottom right. It indicates the desired center of the crop, clamped at source edges.

```json
"4:3": { "source": "landscape", "focal": [0.58, 0.5] }
```

For precise control, use an integer rectangle in source pixels:

```json
"4:3": {
  "source": "landscape",
  "rect": { "left": 356, "top": 100, "width": 1000, "height": 750 }
}
```

A rectangle must remain within the source and match the target aspect, allowing at most one source pixel of rounding. The pipeline extracts it and resizes with `fit: cover`, so any final rounding is cropped rather than stretched. The `6:13` crop removes only a small amount at the top/bottom of these nearly matching portraits. The `9:16` crop is reviewed separately. Tablet crops select a narrower part of each wide composition; ultrawide crops remove some upper/lower image area.

Change `source` when a new independently composed master works better. A square preset or square master is optional and currently not generated. New source images with EXIF orientation must first be saved as a separate, explicitly oriented master with the original also preserved; this prevents ambiguous pixel crop coordinates.

## Enlargement and provenance

Without a per-preset `downloads.allowUpscale` explanation, a too-small source causes a required preset to fail or an optional preset to be listed as unavailable. The six mandatory initial downloads have explicit exceptions. Exact scale, source hash, crop rectangle, byte count and output hash are recorded in the generated catalog. The interface flags enlarged downloads next to their dimensions.

Source files are kept exactly as supplied/generated. The initial sources are untagged RGB; they are interpreted as sRGB. Sharp converts tagged input to sRGB and embeds its sRGB ICC profile in each web deliverable. Other metadata is stripped. This is screen color management, not a guarantee of identical physical displays or a recovered original pigment/profile measurement.

The generation tool and full prompts are recorded in `docs/generation-prompts.json`. The approved portrait generator/date were not supplied, so those details are not invented. These source PNGs are 8-bit RGB.

## Derived assets and determinism

- Landscape previews: 480, 960 and 1600 pixel widths; portrait previews: 420 and 840 widths. Widths are capped to the source.
- WebP at quality 80, no enlargement. The gallery uses responsive `srcset`, intrinsic image dimensions and lazy loading below the first painting.
- Each download has a lightweight crop preview. Resolution changes update the preview and the download link together.
- PNG: exact requested dimensions, Lanczos3 resampling, compression level 9, adaptive filtering, full color (not palette quantization).
- Social sharing: 1200 × 630 JPEG per artwork.
- Review: `review/index.html`, `review/contact-sheet.webp`, and `review/asset-report.json`.

The cache fingerprint includes the record, presets, master hashes, crop code, pipeline code and Sharp/libvips versions. It checks cached output hashes before reuse. Content-equal files are not rewritten, including the generated catalog and review files. No timestamps or random values are embedded. Repeated generation with the same runtime produces the same bytes; codec/platform changes can alter encoding, so the lockfile and runtime versions matter. Typography in the local review sheet may differ by platform; it is not a published/downloadable artwork.

The cache is disposable and ignored. A clean checkout generates everything without relying on it. Removed or renamed records can leave obsolete local files under `public/generated/`; rebuild from a clean checkout before publication if reorganizing the collection. GitHub Actions always builds a clean checkout, so obsolete assets are not published.

## Verification

`npm test` checks focal point clamping, crop bounds/aspect validation and native aspect preservation. `npm run build` additionally checks all output PNG dimensions/hashes, embedded sRGB profiles, required presets, preview budgets, the site size and every local page/image/download URL under `/walls/`. It fails if a full PNG is used as an inline gallery image.

For a new artwork, visually inspect both the review sheet and the actual full-size PNGs. Mathematical crop validity cannot establish that a composition is good. A landscape's centered portrait crop is not a substitute for a reviewed portrait master.
