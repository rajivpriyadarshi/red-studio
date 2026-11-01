"""Static, accessible service previews shared by the home and services pages."""
from pathlib import Path
import re
DIST = Path(__file__).resolve().parents[1] / 'dist'
services = [
 ('brand','Logo & visual style','A logo, colours and templates that make your project recognisable.','Logo designs, shown on three printed sample cards.'),
 ('digital','Websites & apps','Help people find, understand and use your work.','An example website for sharing research with the public.'),
 ('campaigns','Slides, posters & reports','Make the next presentation, paper or public event easier to follow.','An example research poster and presentation slide.'),
 ('motion','Animation & explainers','Explain an idea with moving diagrams, text and 3D.','An illustrative animation frame with a moving red orbit.'),
 ('video','Video editing & colour','Interviews, short-form videos, captions and colour grading.','A sample video editing timeline and colour-treatment comparison.'),
 ('sound','Sound & sonic branding','A short signature sound that people learn to recognise.','A visual score for a short, original sound signature.'),
]
svg_mark='<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="9"><path d="M50 10v80M10 50h80M22 22l56 56M22 78l56-56"/></svg>'
visuals = {
 'brand':f'<div class="logo-samples"><div class="example-piece logo-sample sample-light">{svg_mark}<strong>Fieldwork<span>RESEARCH, SHARED.</span></strong></div><div class="example-piece logo-sample sample-dark"><span class="loop-mark">∿</span><strong>undertone<span>INDEPENDENT SOUND</span></strong></div><div class="example-piece logo-sample sample-red"><strong>R<span>THE RED STUDIO</span></strong></div></div>',
 'digital':'<div class="example-piece research-browser"><div class="preview-chrome"><i></i><i></i><i></i><span>fieldwork / research</span></div><div class="research-page"><small>IDEAS WORTH SHARING</small><strong>A closer look.<br>A clearer picture.</strong><div class="research-chart"><i></i><i></i><i></i><i></i><i></i><i></i></div><span>Explore the research ↗</span></div></div><div class="example-piece research-phone"><span>Fieldwork</span><i></i><strong>Research.<br>For everyone.</strong><b>Read the story ↗</b></div>',
 'campaigns':'<div class="example-piece research-poster"><small>OPEN LAB / POSTER STUDY</small><strong>Big<br>questions.<br>Clear<br>answers.</strong><div class="poster-circle"></div><span>RESEARCH IN CONVERSATION ↗</span></div><div class="example-piece research-slide"><small>FIELDWORK / PRESENTATION</small><strong>What did<br>we learn?</strong><div class="slide-lines"><i></i><i></i><i></i></div><span>01 / THE QUESTION</span></div>',
 'motion':'<div class="example-piece animation-art"><div class="explain-orbit"></div><div class="explain-orbit second"></div><span class="mono">FRAME 01 / EXPLAINER STUDY</span><strong>Make<br>it clear.</strong><small>FROM A COMPLEX IDEA TO A SIMPLE STORY</small></div>',
 'video':'<div class="example-piece edit-frame"><div class="grade-scene"><div></div><span>ORIGINAL</span><span>COLOUR STUDY</span><i></i></div><div class="edit-caption">One conversation.<br>More ways to share it.</div><div class="edit-timeline"><span>INTERVIEW</span><span>CAPTIONS</span><span>SOUND</span><i></i></div></div><span class="example-piece vertical-cut"><strong>9:16</strong><span>SHORT-FORM<br>READY</span></span>',
 'sound':'<div class="example-piece sonic-art"><small>AN EXAMPLE OF A SOUND SIGNATURE</small><div class="sonic-score">'+''.join(f'<i style="--h:{h}%"></i>' for h in [12,24,45,75,95,54,30,15,24,50,85,100,72,32,15,40,65,90,55,23,12])+'</div><strong>Sounds<br>like you.</strong><span>THREE NOTES. ONE RECOGNISABLE IDEA.</span></div>'
}

def render(home):
    links=''
    panels=''
    for i,(key,title,desc,alt) in enumerate(services):
        links+=f'<a class="offering-choice" href="#example-{key}" data-offering="{key}" aria-controls="example-{key}"'+(' aria-current="true"' if i==0 else '')+f'><span class="mono">0{i+1}</span><span><strong>{title}</strong><small>{desc}</small></span><span class="offering-plus" aria-hidden="true">↗</span></a>'
        panels+=f'<article class="offering-example example-{key}" id="example-{key}" data-example="{key}" aria-labelledby="example-{key}-title"><div class="example-art" role="img" aria-label="{alt}">{visuals[key]}</div><div class="example-caption"><div><span class="mono">ILLUSTRATIVE DESIGN / 0{i+1}</span><h3 id="example-{key}-title">{title}</h3></div><a href="services.html#{key}" aria-label="See {title.lower()} details">Scope & details ↗</a></div></article>'
    return f'''<section class="offering-section section-pad" id="services" aria-labelledby="services-title"><div class="section-kicker mono"><span>{'02 / ' if home else ''}WHAT WE CAN HELP WITH</span><span><span class="desktop-service-hint">HOVER, FOCUS OR TAP TO EXPLORE</span><span class="mobile-service-hint">SWIPE SERVICES / TAP TO PREVIEW</span></span></div><div class="offering-heading"><h2 id="services-title">What do you<br><span class="muted">need to make?</span></h2><p>A project website. A conference poster. A film that makes your findings click. Start with the thing you need.</p></div><div class="offering-desk" data-offering-desk><nav class="offering-list" aria-label="Explore our services">{links}</nav><div class="offering-previews">{panels}</div></div><p class="offering-note mono">EXAMPLES SHOW POSSIBLE FORMATS. FICTIONAL NAMES, NO CLIENT CLAIMS.</p></section>'''

soundwaves=''.join(f'<i style="--h:{h}%;--i:{i}"></i>' for i,h in enumerate([15,28,55,80,100,68,37,17,36,70,92,61,29,17,42,72,95,60,24]))
def motion_section():
 return f'''<section class="motion-sound-section section-pad" id="motion-sound" aria-labelledby="motion-sound-title"><div class="section-kicker mono"><span>MOTION & SOUND</span><span>SEE IT. HEAR IT.</span></div><div class="motion-sound-layout"><div class="motion-sound-copy"><h2 id="motion-sound-title">Give your idea<br>movement.<br><em>And a voice.</em></h2><p>A moving diagram can explain what a paragraph can’t. A short sound can make a project, podcast or band instantly recognisable.</p><p>We make animations, edit films and create sonic branding—that simply means a sound of your own.</p><a class="underlined-link" href="services.html#motion">Animation, video & sound <span aria-hidden="true">↗</span></a></div><div class="av-demo" data-av-demo><div class="av-screen"><span class="mono">THE RED STUDIO / SOUND & MOTION STUDY</span><div class="av-mark" aria-hidden="true">{svg_mark}<span>red.</span></div><div class="av-waves" aria-hidden="true">{soundwaves}</div><span class="av-timestamp mono">00:00 / 00:03</span></div><div class="av-controls"><button type="button" data-av-play aria-pressed="false"><span aria-hidden="true">▶</span> Play sound & motion</button><span class="mono">3 SECONDS / ORIGINAL DEMO</span></div><p class="av-status" role="status">Sound only plays when you press play.</p></div></div></section>'''

for filename in ['index.html','services.html']:
    p = DIST / filename
    s = p.read_text()
    home = filename == 'index.html'
    s, count = re.subn(r'<section class="(?:services-section|offering-section).*?</section>', lambda _: render(home), s, count=1, flags=re.S)
    if not count:
        anchor = '<section class="section-pad page-section">'
        assert anchor in s
        s = s.replace(anchor, render(home) + anchor, 1)
    s, count = re.subn(r'<section class="(?:workbench-section|motion-sound-section).*?</section>', lambda _: motion_section(), s, count=1, flags=re.S)
    if not count:
        assert home
        s = s.replace(render(home), render(home) + motion_section(), 1)
    if 'href="research.css' not in s:
        s = s.replace('</head>', '<link rel="stylesheet" href="research.css?v=research-1"></head>')
    if 'src="offerings.js' not in s:
        s = s.replace('</head>', '<script type="module" src="offerings.js?v=research-1"></script></head>')
    if not home and 'src="vendor/gsap.min.js' not in s:
        s = s.replace('<script defer src="page.js', '<script defer src="vendor/gsap.min.js"></script><script defer src="page.js')
    p.write_text(s)
