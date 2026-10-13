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

## The Weave concept

A third, independent Red Studio direction is published at [Red Studio — The Weave](https://rajivpriyadarshi.github.io/red-studio/weave/). Its static files live in `dist/weave/`. The site opens with an original “Ideas you can feel” hero: kinetic typography, a red sculptural loop, and a studio introduction to identity, digital, motion, and sound. After the studio chapter, the loop visibly opens and stretches into a continuous red ribbon on its own scroll runway. The same red material and deep-red atmosphere persist throughout, with warm particles, glass edges, reflections, and interface surfaces. Project selection never recolors the environment. The sheet keeps its width, and project planes arrive last. The ribbon anchors a spiral of refractive glass panels, with camera orbiting, flowing particles, atmospheric post effects, and GSAP transitions. The project artwork is original and labelled as concept work.

Scroll or drag to explore; previous/next buttons, the project rail, and keyboard arrows provide alternate navigation. The studio, services, and contact flow are accessible through native dialogs. Audio is optional, motion can be paused, and reduced-motion preferences are supported. Inquiries use `theredstudio@gmail.com`.

## Content rework branch

`content-rework` updates the original landing page. It adds dedicated Services, Prices, Compliance and Studio pages, a Trondheim origin, and the named team: Shubham Jain (Founder) and Rajiv Priyadarshi (Chief Design Officer). Zinc OneView and Zinc Cross-border are explicitly labelled placeholders for Rajiv’s individual work, with case studies to be supplied later. Initials represent the team until real portraits are supplied.

The price list proposes seven fixed-scope packages in NOK, with two feedback rounds, explicit exclusions, a 25% VAT display option where applicable, and approved extras at NOK 1,200/hour excluding VAT. Monthly support is NOK 22,000 for 20 hours. The public Pages workflow still deploys only `main`.

### Pricing basis — researched 12 October 2026

Published Norwegian offers informed the positioning; these are Red Studio’s proposed scopes and prices, not a statistical market average.

- [Gasta](https://www.gasta.no/designpakkar) publishes basic identity at NOK 15,000 and complete identity at NOK 35,000, excluding VAT. This is the closest reference for the two identity packages.
- [Box](https://box.no/innsikt/designbyra) describes identity projects at NOK 25,000–80,000 and business websites at NOK 40,000–120,000. Red Studio’s NOK 35,000 website package is deliberately limited to one landing page.
- [Smartbyrå](https://smartbyra.no/nettside-for-bedriften/webbyra-priser/hva-tar-et-webbyra-i-timepris) describes established agency rates at NOK 1,000–1,800/hour excluding VAT. NOK 1,200 is a proposed boutique-studio rate, not a profitability calculation.
- [Finn’s Workshop](https://www.finns-workshop.no/prisveiledning) lists 30–60 second conceptual films from NOK 45,000 excluding VAT. The NOK 18,000 motion starter covers only 15 seconds of 2D animation using supplied assets; 3D and longer films need a separate quote.
- [Skatteetaten](https://www.skatteetaten.no/en/rates/value-added-tax/) lists the normal VAT rate at 25%. Registration and the final tax treatment must be established for invoicing; the display toggle is a planning aid.

The sound and campaign prices are proposed effort-based offers, with no direct Norwegian like-for-like benchmark established. Delivery windows assume a complete brief and timely consolidated feedback. Review actual hours and margin after the first three completed projects; reduce scope or adjust prices if the hourly return falls below the operating target.

The Compliance page describes a proposed project workflow and the site’s actual form behaviour. It makes no claim of certification or past EU client experience. Privacy-by-design guidance is linked to the [EDPB](https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en).

### Interactive rate book

The homepage pricing chapter and the Prices page use illustrated quote sheets, a keyboard-accessible package selector and GSAP transitions. The Prices page includes an itemised estimate builder, VAT display controls and a monthly support section. Brand identity and Logo essentials cannot both be added to the same estimate. The inquiry handoff carries selected scopes and their base-price total; final overlap, timing and tax treatment are confirmed in a written quote.

`dist/pricing-data.json` is the canonical package data. After changing it, run `python3 scripts/render-pricing.py` to regenerate the static package views and embedded configuration. `dist/pricing.js` handles selection, estimates, VAT and reduced motion; `dist/pricing.css` scopes the visual treatment to these two views. No new third-party dependency or build step is needed to run the site.

### Project carousel

The homepage presents all six project entries in a perspective stack. The active sheet sits forward and above its neighbours; side cards recede with angled transforms, softer opacity and blur. `dist/projects.js` uses the bundled GSAP library for interruptible transitions, direct dragging and a one-time entrance. Visitors can select a side card, use arrows or dots, or browse with Left/Right and Home/End keys. There is no automatic advance. The site motion toggle and system reduced-motion preference keep selection available with immediate changes. Without GSAP, the sheets remain a readable static collection.

`dist/projects.css` scopes the artwork and responsive layout. Offgrid, Form and Echo are illustrative concept studies inspired by the supplied reference. The EU entry remains a placeholder with its name, programme and team role pending; the Zinc entries identify Rajiv’s individual work and are awaiting case-study details.

### Content direction

The supplied “The Red Studio — Death to AI slop” HTML informed the homepage manifesto, studio principles, service descriptions, experimental lab and transparent-pricing language. “Death to AI slop” expresses a standard for original, considered work and visible authorship; it does not claim a ban on AI tools. Proposed AI assistance and confidential-data handling remain addressed in the project approach. Existing prices, deliverables, team details, clearly labelled case-study placeholders and the “Got a feeling?” closing are retained. No EU-project, funding or certification claims were added.

### Homepage critique and restructuring

The homepage now leads with the offering beside the manifesto, then playable motion and sound studies, a compact service index, the illustrated rate book, people and process, and the original contact closing. Oversized case-study placeholders became short, clearly attributed entries for Rajiv’s work at Zinc. Repeated principles and oversized team monograms were consolidated into one studio chapter. Work is a primary navigation destination; Compliance remains available in the footer and project approach. The pricing data, scopes and inquiry flow are retained.

`dist/home.css` scopes the new layout to the homepage. The sound study accepts a keyboard-accessible frequency slider as well as pointer input; sound starts only when requested and stops when the study leaves view. GSAP entrances run once, paused motion keeps all content available, and returning through browser history retains the WebGL scenes when the browser caches the page.

### Project placeholders from the supplied studio draft

The homepage includes Offgrid, Form and Echo from the user-supplied HTML, each labelled as a concept study. An EU-project entry is explicitly a placeholder: the draft mentions EU-project experience but supplies no project name, funding programme or team role. Those details remain pending. Rajiv’s Zinc OneView and Cross-border entries remain available in the expandable practice list.
