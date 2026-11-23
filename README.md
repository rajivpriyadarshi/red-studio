# Red Studio

A creative studio website born in Trondheim, with GSAP motion and Three.js visuals. Researchers, engineers, businesses and artists can explore relevant starting points alongside an open invitation to anyone with an idea.

[Open Red Studio](https://theredstudio.vercel.app/).

The website is published on Vercel and [GitHub Pages](https://rajivpriyadarshi.github.io/red-studio/). The older private Sites preview is a historical version.

## Run locally

No installation or build is needed. Fonts, GSAP, and Three.js are bundled in `dist/`.

From this repository's root, run:

```sh
python3 -m http.server 5173 --directory dist
```

Then open <http://localhost:5173>.

Alternatively, run `npm run dev` if Node.js and Python 3 are available. Serve the files over HTTP; opening `index.html` directly will not load the JavaScript modules correctly.

## Current local edition

The local edition on `november-improvements` uses five supplied films as its opening. Full films load on request. Services include an audio-reactive drawing, and the fare board lists all nine fees and a live 3D ticket press prints each package.

## Source

- `dist/index.html` and `dist/programme.css` contain the page, responsive layouts and film credits.
- `dist/programme.js` controls the screenings and fare board. The shared menu and email draft are in `dist/programme-nav.js` and `dist/brief.js`.
- `dist/scope-motion.js` draws the service artwork. The rotating press is built in `dist/press-model.js`. Its feed animation and ticket surfaces are in `dist/ticket-printer.js`. The original ticket plates are in `dist/assets/ticket-window/`.
- `dist/pricing-data.json` contains the fixed-fee packages. Run `python3 scripts/render-pricing.py` after editing them.
- `dist/assets/screenings/` contains the posters, short silent previews, full films and audio excerpt.
- `dist/vendor/`: bundled animation and rendering libraries.
- `dist/licenses/`: third-party license notices.
- `.openai/hosting.json`: configuration for the existing private hosted preview.

## Content and inquiries

The work gallery contains supplied sound and video work. Individual credits and the Audi university assignment are identified in the film player.

Project inquiries are addressed to `theredstudiopost@gmail.com`. The form creates an email draft for the visitor to review and send in their email app. It does not submit inquiries to a server.

To change the contact address, update the homepage, the project terms and `dist/brief.js`.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` publishes `dist/` when website files change on `main`. It can also be started manually from the repository's Actions tab. No dependency installation or build step is required.

## Orbit concept

A second Red Studio direction is published separately at [Red Studio — Orbit](https://rajivpriyadarshi.github.io/red-studio/orbit/). Its static files live in `dist/orbit/`; the original landing page remains at the root URL.

## The Weave concept

A third, independent Red Studio direction is published at [Red Studio — The Weave](https://rajivpriyadarshi.github.io/red-studio/weave/). Its static files live in `dist/weave/`. The site opens with an original “Ideas you can feel” hero: kinetic typography, a red sculptural loop, and a studio introduction to identity, digital, motion, and sound. After the studio chapter, the loop visibly opens and stretches into a continuous red ribbon on its own scroll runway. The same red material and deep-red atmosphere persist throughout, with warm particles, glass edges, reflections, and interface surfaces. Project selection never recolors the environment. The sheet keeps its width, and project planes arrive last. The ribbon anchors a spiral of refractive glass panels, with camera orbiting, flowing particles, atmospheric post effects, and GSAP transitions. The project artwork is original and labelled as concept work.

Scroll or drag to explore; previous/next buttons, the project rail, and keyboard arrows provide alternate navigation. The studio, services, and contact flow are accessible through native dialogs. Audio is optional, motion can be paused, and reduced-motion preferences are supported. Inquiries use `theredstudiopost@gmail.com`.

## Content rework branch

`content-rework` updates the original landing page. It adds dedicated Services, Prices, Compliance and Studio pages, a Trondheim origin, and the named team: Shubham Jain (Founder) and Rajiv Priyadarshi (Chief Design Officer). Zinc OneView and Zinc Cross-border are explicitly labelled placeholders for Rajiv’s individual work, with case studies to be supplied later. The homepage and Studio page use the supplied portraits of Shubham and Rajiv, presented in grayscale with CSS. Original photo files remain unchanged in `dist/assets/team/`.

The price list proposes eight fixed-scope packages in NOK, with two feedback rounds, explicit exclusions, a 25% VAT display option where applicable, and approved extras at NOK 1,200/hour excluding VAT. Monthly support is NOK 22,000 for 20 hours. The public Pages workflow still deploys only `main`.

### Pricing basis — researched 12 October 2026

Published Norwegian offers informed the positioning; these are Red Studio’s proposed scopes and prices, not a statistical market average.

- [Gasta](https://www.gasta.no/designpakkar) publishes basic identity at NOK 15,000 and complete identity at NOK 35,000, excluding VAT. This is the closest reference for the two identity packages.
- [Box](https://box.no/innsikt/designbyra) describes identity projects at NOK 25,000–80,000 and business websites at NOK 40,000–120,000. Red Studio’s NOK 35,000 website package is deliberately limited to one landing page.
- [Smartbyrå](https://smartbyra.no/nettside-for-bedriften/webbyra-priser/hva-tar-et-webbyra-i-timepris) describes established agency rates at NOK 1,000–1,800/hour excluding VAT. NOK 1,200 is a proposed boutique-studio rate, not a profitability calculation.
- [Finn’s Workshop](https://www.finns-workshop.no/prisveiledning) lists 30–60 second conceptual films from NOK 45,000 excluding VAT. The NOK 18,000 motion starter covers only 15 seconds of 2D animation using supplied assets; 3D and longer films need a separate quote.
- [Skatteetaten](https://www.skatteetaten.no/en/rates/value-added-tax/) lists the normal VAT rate at 25%. Registration and the final tax treatment must be established for invoicing; the display toggle is a planning aid.

The sound and campaign prices are proposed effort-based offers, with no direct Norwegian like-for-like benchmark established. Delivery windows assume a complete brief and timely consolidated feedback. Review actual hours and margin after the first three completed projects; reduce scope or adjust prices if the hourly return falls below the operating target.

The Compliance page describes a proposed project workflow and the site’s actual form behaviour. It makes no claim of certification or past EU client experience. Privacy-by-design guidance is linked to the [EDPB](https://www.edpb.europa.eu/sme/be-compliant/be-compliant_en).

### Homepage navigation and pricing

The main navigation links to sections on the homepage. The old Services, Pricing and Studio addresses forward to the corresponding sections. Privacy and compliance details have their own page.

The homepage lists all eight fixed-fee packages and monthly support. Open a row for inclusions, exclusions and an inquiry. Prices are in NOK excluding VAT. After editing `dist/pricing-data.json`, run `python3 scripts/render-pricing.py` to regenerate the list.

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

### Visual directions filmstrip

The homepage’s former motion/sound demo panels are replaced by an immersive, full-width filmstrip in `dist/directions.js` and `dist/directions.css`. Five frames share a top edge: hovering or focusing a frame unfurls its crop and crossfades the scene, title and discipline. Click, arrow keys, horizontal dragging and horizontal trackpad gestures recenter the strip; vertical page scrolling stays native. Motion pause and system reduced motion make changes immediate.

The photographic artwork is credited Lummi reference imagery, not studio-authored work or client case studies. Local, optimised WebP images and separate small thumbnails are in `dist/assets/directions/`; creator credits and source links are in `dist/licenses/lummi-images.txt`. The interaction was studied from [Crafter UI’s Hero Carousel](https://21st.dev/@crafterui/components/hero-carousel) and independently implemented in the existing GSAP stack.

### Research-focused update — 1 November 2026

The homepage now leads with “Your research. Made clear.” and Trondheim, Norway. The stock-image directions filmstrip is removed from the homepage so there is one work showcase. Dedicated services include logos, websites/apps, slides/posters/reports, animation, video editing/colour grading and sound signatures. Existing project statuses remain labelled; no new research-client credentials are claimed.

`dist/research.css` styles the updated sections. `scripts/render-offerings.py` generates the shared static service previews and motion/sound section for the home and Services pages; `dist/offerings.js` enhances them with keyboard and pointer selection. Mobile services scroll horizontally. Animations respect the motion toggle and system preference. The sound sample starts only on an explicit click, can be stopped, and stops on page hide.

The new Video edit & short cuts package is an effort-based studio offer at NOK 12,000 excluding VAT, not a market benchmark: a supplied-footage edit up to 90 seconds plus three short cuts, basic colour/audio treatment, approved captions and two feedback rounds. The independent-rate offer is quoted individually; the written quote shows the standard fee, discount and total. No unapproved blanket discount percentage is published.

Both generators are safe to rerun. Regenerate pricing after package-data changes, and offerings after changing the shared examples. Deploy the repository root with Vercel’s project root set to `dist`; do not deploy a second nested `dist` directory.

### Audience refinement — local review

The hero returns to “Death to AI slop”. The headline remains stable; a separate visitor-controlled section offers starting points for anyone with an idea, researchers, engineers and makers, businesses and founders, and bands and artists. Selecting a tab reveals relevant deliverables and an inquiry prompt without replacing an edited visitor draft. Tabs support keyboard navigation, interrupted transitions and reduced motion. The page keeps its Trondheim emphasis, single work showcase, interactive services, sound demo and transparent pricing. Services and Studio copy now address the broader audience.

This audience revision was deployed to Vercel after the owner explicitly confirmed publication on 2 November 2026.

### Living ribbon prototype

The hero ribbon now begins as a strip and folds into an open knot. Dragging the mesh applies a local spring deformation; release leaves a small, resettable change. A single WebGL canvas, mesh and red material unspool between the hero and the audience stage as the page scrolls normally. Audience tabs morph the same vertices into a flowing research path, an engineered structure, an R monogram or a waveform. The Artists route offers an explicit play/stop control for a short original sound, with no autoplay.

`dist/living-ribbon.js` owns geometry, gesture response, scroll handoff and cleanup; `dist/living-ribbon.css` places the stage and controls. `dist/personas.js` dispatches selection changes immediately. The system motion preference switches directly between states. Pull and Reset buttons provide keyboard alternatives; touch areas keep vertical scrolling available. An illustrated fallback remains if WebGL is unavailable. This ribbon version was approved and deployed to Vercel on 2 November 2026.

### Creative brief stage — local review

The audience section now uses a charcoal composition with a horizontal, sticky world selector and original layered design studies. Each audience has its own poster, interface or release artwork. Choosing an audience changes the copy, paper composition and existing ribbon together; hovering or focusing a service lifts its corresponding piece forward. Keyboard navigation and system/site reduced-motion controls remain supported. Mobile uses an internally scrollable selector and stacks artwork above the short brief. Inquiry buttons retain their audience-specific draft prompts.

`dist/brief-studio.css` owns this section, with static markup generated by `scripts/render-personas.py` and interaction in `dist/personas.js`. The studies are explicitly illustrative and make no client-work claims. The hero, project showcase, prices and team copy are preserved. Nothing in this revision is approved for publication.

### Homepage typography cleanup — local review

The homepage now uses a shared reading scale in `dist/readability.css`: 18px body text on desktop, 16px body text on phones, 16px controls and 14px supporting notes. Section titles and item headings follow shared sizes. Decorative figure labels, section folios, repeated location/scroll strips and small text inside illustrative artwork are removed from view. The hero follows its content height, with a shorter transition into the next section. Project captions have extra space for readable descriptions. Ribbon controls remain legible and clickable as the hero scrolls. This revision remains local and unpublished.

### Services consolidation — local review

Motion, video editing and sound remain in the shared Services offering. The three-note sound player now lives inside the Sound service preview on the homepage and Services page; the separate motion/sound feature section is removed. Playback stays opt-in and stops when the visitor changes services, scrolls the player out of view or leaves the page. This refinement has not been deployed.
