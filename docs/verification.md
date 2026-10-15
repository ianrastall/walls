# Initial verification

Reviewed on 2026-10-15.

- Three source portraits are byte-for-byte copies of the supplied PNGs. Three separately generated landscapes are preserved as returned by the built-in image tool.
- All seven crops per painting were visually reviewed in the contact sheet. Snow's 9:16 focal point and snow/meadow ultrawide focal points were adjusted to retain their suns. The narrow formats use the original portraits.
- All 21 downloadable files are PNGs with exact labeled pixel dimensions and embedded sRGB profiles. The six mandatory phone/desktop files are explicitly marked as enlarged.
- The static gallery has five pages, with 125 local URL references verified under `/walls/`. Gallery previews are WebP, not full PNG downloads. Social previews are JPEG.
- Desktop layout reviewed at 1440 × 1000; mobile gallery and artwork/download layout reviewed at 390 × 844. No horizontal overflow was found.
- The resolution selector was exercised through all seven options; the download URL and selected crop change together. The selected phone preview retains the original composition.
- Keyboard navigation reaches the resolution selector and download link; the download focus outline is visible. The page has a skip link, labeled native selector, descriptive image alternatives, heading structure and a polite announcement of changed download details. Foreground colors were selected for contrast against the dark background. This is a targeted accessibility check, not a formal conformance audit.
- The site has a 404 page, image-load fallback messages, a collection-empty state, and direct download links when JavaScript is disabled.
- Crop tests check focal clamping, out-of-bounds rectangles and aspect mismatch. The build checks source/output hashes, mandatory presets, dimensions, color profiles, local references, preview budgets and published size.

Re-run `npm test` and `npm run build` after changes. Review new crops manually; automated checks cannot judge their composition.
