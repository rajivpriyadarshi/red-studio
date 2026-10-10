# Red Studio

A multidisciplinary design studio landing page built around **Designed to be felt**.

[Open Red Studio](https://rajivpriyadarshi.github.io/red-studio/).

The website is published on GitHub Pages. A separate [private preview](https://red-studio-feeling.zinc-money-p-8104.chatgpt.site/) is available through the owner's ChatGPT sign-in.

## Run locally

No installation or build is needed. Fonts, GSAP, and Three.js are bundled in `dist/`.

From this repository's root, run:

```sh
python3 -m http.server 5173 --directory dist
```

Then open <http://localhost:5173>.

Alternatively, run `npm run dev` if Node.js and Python 3 are available. Serve the files over HTTP; opening `index.html` directly will not load the JavaScript modules correctly.

## Features

- Interactive Three.js ribbon sculpture with illustrated fallback.
- GSAP typography, scroll choreography, and project transitions.
- Custom liquid WebGL shader and opt-in synthesized sound.
- A 16-second kinetic typography experiment with playback controls.
- Responsive project gallery and service panels.
- Motion pause controls and support for reduced-motion preferences.
- An inquiry form that prepares a reviewable email draft.

## Source

- `dist/index.html`: page content, project artwork, and dialogs.
- `dist/styles.css`: visual design and responsive layouts.
- `dist/app.js`: GSAP motion, interactions, inquiries, and audio.
- `dist/scenes.js`: Three.js sculpture and liquid shader.
- `dist/assets/`: bundled fonts and favicon.
- `dist/vendor/`: bundled animation and rendering libraries.
- `dist/licenses/`: third-party license notices.
- `.openai/hosting.json`: configuration for the existing private hosted preview.

## Content and inquiries

Offgrid, Form, and Echo are original illustrative concept studies, not client commissions.

Project inquiries are addressed to `theredstudio@gmail.com`. The form creates an email draft for the visitor to review and send in their email app. It does not submit inquiries to a server.

To change the contact address, update `dist/index.html` and `dist/app.js`.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` publishes `dist/` when website files change on `main`. It can also be started manually from the repository's Actions tab. No dependency installation or build step is required.

## Orbit concept

A second Red Studio direction is published separately at [Red Studio — Orbit](https://rajivpriyadarshi.github.io/red-studio/orbit/). Its static files live in `dist/orbit/`; the original landing page remains at the root URL.
