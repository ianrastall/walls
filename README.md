# Walls

A static gallery of AI-generated art wallpapers, curated and art-directed by Ian Rastall.

- Gallery: https://ianrastall.github.io/walls/
- Repository: https://github.com/ianrastall/walls
- Astro 7.4.0, Sharp 0.35.5, Node 24; npm lockfile committed.

## Run locally

```sh
npm ci
npm test
npm run build
npm run preview
```

Open the printed URL with the `/walls/` path. `npm run dev` runs the image pipeline before starting the development server. After changing artwork metadata, run `npm run images` again.

The build generates the images, builds the static pages, then verifies exact PNG dimensions, sRGB profiles, file hashes, mandatory formats, preview budgets, local links, and the site size. No runtime server or external font/image service is needed.

## The initial artwork

There are three paintings: **Quiet Snowy Mountain Mosaic**, **Lyrical Wildflower Meadow**, and **Vaporous Nocturne over Fading Mountains**. Each has the exact supplied portrait and a separately generated landscape adaptation. At Ian's request, the nocturne landscape was then revised using the Bauhaus painting language of the first two works. Its first atmospheric landscape is also preserved in `assets/masters/` as a previous source; phone downloads retain the original atmospheric portrait.

The preserved portraits are **841 × 1870**. The built-in image generation tool returned **1672 × 941** landscapes, despite the requested 3840 × 2160 format. These files are retained unchanged in `assets/masters/`. The requested desktop **3840 × 2160 PNG** and phone **1080 × 2340 PNG** downloads are explicit Lanczos3 enlargements, not native 4K generation. The small ratio adjustment is cropped without stretching. Full generation prompts are in [docs/generation-prompts.json](docs/generation-prompts.json) and [the nocturne revision record](docs/nocturne-bauhaus-generation.json).

The other five downloads per painting use smaller dimensions and do not enlarge their source. Square compositions have been deferred.

## Add a painting

1. Put the untouched source files in `assets/masters/`. Use descriptive, unique filenames. Keep an independent backup of original masters. Do not replace a master with a resized download.
2. Copy one JSON record in `artworks/` to a new slug. This is the only hand-edited metadata record for that painting. Set `status` to `draft` while preparing it; draft records are excluded from the public gallery.
3. Set its title, description, tags, alt text, order, source paths and measured dimensions. Record how each source was created and any previous resizing. Never attribute AI-generated work to a historical painter.
4. Set `masterVariants` to the appropriate source keys. Use an independently composed portrait when a landscape cannot supply a useful vertical crop.
5. Set one crop decision for every enabled aspect ratio. Use a normalized `focal` point or an explicit pixel `rect`; see [the pipeline guide](docs/image-pipeline.md).
6. Remove inherited `downloads.allowUpscale` exceptions. The default is to reject a required enlargement and skip optional ones. Add a specific explanation only if you deliberately accept enlargement.
7. Set `status` to `published`, then run `npm run images`. Inspect `review/index.html` in a browser and `review/contact-sheet.webp`. Adjust focal points or select a better source until every crop works. Record the decision in `compositionReview`.
8. Run `npm test` and `npm run build`. Inspect the local gallery at narrow and wide widths, change the download selector, and check the enlarged output if any.

Published files live in `public/generated/`; their machine-generated metadata lives in `src/generated/artworks.json`. Both are ignored by Git and recreated from the preserved masters and their authored records. Do not edit generated files.

## Publish an update

Commit the changed masters, metadata, presets or source code, including `package-lock.json` if dependencies changed, and push to `main`:

```sh
git add assets/masters artworks config src scripts docs package.json package-lock.json
git commit -m "Add a painting"
git push origin main
```

GitHub Actions builds from the committed lockfile, runs the crop tests and asset/link verification, uploads `dist/`, and deploys to Pages. The workflow can also be run manually from the Actions tab. Repository Settings → Pages must use **GitHub Actions** as its source.

`astro.config.mjs` defines the `https://ianrastall.github.io` origin and `/walls` base. `src/lib/gallery.ts` prefixes all application URLs, including previews, downloads and navigation. Social images and canonical URLs use the public origin.

## Hosting and storage

Including the nocturne revision and its preserved earlier landscape, the masters total approximately **22.0 MiB**. The site is approximately **80.5 MiB**, including **74.7 MiB** of downloadable PNGs. Sources are committed once; generated PNGs, previews, intermediate renders and review sheets are not committed. Git LFS is not used.

As checked on 2026-10-15, GitHub documents a 1 GB published Pages site limit, a recommended 1 GB source repository limit and a soft 100 GB monthly bandwidth limit. The initial collection fits without a separate hosting service. Monitor bandwidth as downloads grow and check the actual build size before adding many images. A separate asset host should be introduced only if collection size or traffic calls for it.

References: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Astro's Pages deployment guide](https://docs.astro.build/en/guides/deploy/github/), [Sharp color management](https://sharp.pixelplumbing.com/api-colour/).

## Attribution and terms

The images are AI-generated, curated and art-directed by Ian Rastall. Historical artists and movements are influences, not authors. This project does not add an artwork reuse license or make copyright promises. No software license has been selected; that is a separate decision from artwork reuse terms.
