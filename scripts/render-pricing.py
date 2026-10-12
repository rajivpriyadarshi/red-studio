"""Regenerate Red Studio's static pricing views from pricing-data.json."""
from pathlib import Path
import json, re
ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
config = json.loads((DIST / 'pricing-data.json').read_text())
plans = config['packages']
by_id = {p['id']: p for p in plans}
config['support'] = {'price': 22000, 'hours': 20}
format_price = lambda n: f'{n:,}'


def art(plan):
    id = plan['id']
    graphics = {
        'logo': '<div class="art-logo"><span>r<span>.</span></span><i class="art-guide guide-x"></i><i class="art-guide guide-y"></i><b class="art-pin pin-one"></b><b class="art-pin pin-two"></b></div>',
        'identity': '<div class="art-identity"><span class="identity-word">red.</span><div class="identity-alphabet">Aa<br>Bb</div><div class="identity-swatches"><i></i><i></i><i></i></div><div class="identity-lines"><i></i><i></i><i></i></div></div>',
        'website': '<div class="art-browser"><div class="browser-chrome"><i></i><i></i><i></i><span>your-brand.com</span></div><div class="browser-page"><span class="browser-brand">red.</span><span class="browser-nav">About &nbsp; Work &nbsp; Contact</span><strong>From<br>idea.</strong><div class="browser-shape"></div><span class="browser-action">Explore ↗</span></div></div>',
        'product': '<div class="art-product"><div class="product-device"><span class="mono">YOUR PRODUCT</span><strong>Make<br>it useful.</strong><div class="product-field"></div><div class="product-field"></div><i>Continue →</i></div><div class="product-tokens"><span>Aa</span><i></i><b></b><div></div></div></div>',
        'campaign': '<div class="art-campaign"><div><span class="mono">CAMPAIGN / 01</span><strong>Your<br>idea.</strong><i>↗</i></div><div><span class="mono">CAMPAIGN / 02</span><strong>Out<br>there.</strong><i>↗</i></div></div>',
        'motion': '<div class="art-motion"><svg viewBox="0 0 300 200" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="150" cy="100" rx="115" ry="72"/><ellipse cx="150" cy="100" rx="90" ry="72"/><ellipse cx="150" cy="100" rx="65" ry="72"/><ellipse cx="150" cy="100" rx="40" ry="72"/></svg><span>move.</span><i class="mono">00:00 — 00:15</i></div>',
        'sound': '<div class="art-sound"><div class="sound-bars">'+''.join(f'<i style="--bar:{h}%"></i>' for h in [12,22,40,68,92,65,35,19,49,79,100,80,44,25,12])+'</div><span>hear.</span><i class="mono">SONIC LOGO + 3 CUES</i></div>'
    }
    return f'<div class="quote-art art-{id}" aria-hidden="true" data-rate-art><div class="art-corner mono">RED STUDIO / FORMAT STUDY</div>{graphics[id].replace("<div class=", "<div data-art-content class=", 1)}<div class="art-bottom mono"><span>0{plans.index(plan)+1} / 07</span><span>{plan["group"].upper()}</span></div></div>'


def sheet(plan, home=False):
    index = plans.index(plan)+1
    id = 'price-'+plan['id'] if home else plan['id']
    inquiry = f'<button class="quote-cta" data-inquiry data-package="{plan["name"]}">Discuss this project <span>↗</span></button>' if home else f'<a class="quote-cta" href="index.html?package={plan["id"]}#contact">Discuss this project <span>↗</span></a>'
    scope = '<ul class="quote-inclusions">'+''.join('<li>'+item+'</li>' for item in (plan['items'][:3] if home else plan['items']))+'</ul>'
    if home:
        scope += f'<a class="quote-scope-link" href="pricing.html#{plan["id"]}">See the full scope & exclusions ↗</a>'
    else:
        scope = '<details class="quote-scope" open><summary>What’s included <span>−</span></summary>'+scope+f'<p class="quote-excludes"><strong>Outside this scope:</strong> {plan["excludes"]}</p></details>'
    return f'''<article class="quote-sheet" id="{id}" data-plan="{plan['id']}" aria-labelledby="{id}-title">
{art(plan)}<div class="quote-content"><div class="quote-meta mono"><span>PROJECT 0{index} / FIXED SCOPE</span><span>{plan['time'].upper()}</span></div>
<h3 id="{id}-title" data-price-reveal>{plan['name']}</h3><p class="rate-amount" data-price-reveal><span data-price="{plan['price']}" data-main-price aria-hidden="true">{format_price(plan['price'])}</span><small>NOK</small><span class="sr-only" data-price-accessible>{format_price(plan['price'])} Norwegian kroner, excluding VAT</span></p>
<p class="quote-tax mono" data-tax-label>EXCLUDING VAT / ONE-TIME PROJECT</p><p class="quote-fit" data-price-reveal>{plan['fit']}</p>{scope}<div class="quote-tear" aria-hidden="true"></div><div class="quote-bottom"><span class="mono">2 FEEDBACK ROUNDS<br>FINAL FILES</span>{inquiry}</div></div></article>'''


def choices(selected, home=False):
    return '<nav class="package-choices" aria-label="Choose a design package">'+''.join(f'''<a class="package-choice" href="pricing.html#{p['id']}" data-plan-link="{p['id']}"{' aria-current="true"' if p==selected[0] else ''}><span class="choice-index mono">0{plans.index(p)+1}</span><span class="choice-name">{p['name']}<small>{p['time']}</small></span><span class="choice-cost"><span data-price="{p['price']}">{format_price(p['price'])}</span><small>NOK</small></span><span class="choice-arrow" aria-hidden="true">↗</span></a>'''.replace('href="pricing.html#','href="#' if not home else 'href="pricing.html#') for p in selected)+'</nav>'


def ratebook(selected, home=False):
    mobile = '' if home else '<label class="mobile-package-selector" for="pricing-package-select"><span class="mono">CHOOSE A PACKAGE</span><select id="pricing-package-select" aria-label="Choose a design package">'+''.join(f'<option value="{p["id"]}">{p["name"]} — {format_price(p["price"])} NOK</option>' for p in selected)+'</select></label>'
    return f'''<div class="ratebook {'ratebook-home' if home else 'ratebook-page'}" data-pricing data-default="{selected[0]['id']}"><div class="rate-navigation"><p class="mono rate-selection-label">CHOOSE YOUR STARTING POINT</p>{choices(selected,home)}{mobile}<p class="rate-navigation-note">A focused scope. A fixed price.<br>Room to make it your own.</p>{'<a class="rate-all-link" href="pricing.html">Explore all seven packages <span>↗</span></a>' if home else '<a class="rate-all-link" href="#build-estimate">Combine packages <span>↘</span></a>'}</div><div class="rate-preview">{''.join(sheet(p,home) for p in selected)}</div><p class="sr-only" data-rate-announcement role="status"></p></div>'''


config_markup = '<script type="application/json" id="pricing-config">'+json.dumps(config,ensure_ascii=False).replace('<','\\u003c')+'</script>'
home = f'''<section class="pricing-section rate-home section-pad" id="prices" aria-labelledby="prices-title"><div class="section-kicker mono"><span>04 / PRICES</span><span>NOK / EXCLUDING VAT</span></div><div class="rate-home-heading"><h2 id="prices-title">Your next idea.<br><span>Let’s price it.</span></h2><p>Start with a logo, a website, or a little motion.<br>See the price and what comes with it.</p></div>{ratebook([by_id['logo'],by_id['website'],by_id['motion']],True)}<div class="rate-home-foot mono"><span>APPROVED EXTRAS: 1,200 NOK / HOUR</span><a href="pricing.html#build-estimate">BUILD A PROJECT ESTIMATE ↗</a></div>{config_markup}</section>'''
index_file = DIST/'index.html'
s = index_file.read_text()
s, count = re.subn(r'<section class="pricing-section.*?</section>',lambda m:home,s,count=1,flags=re.S)
assert count==1
if 'pricing.css' not in s:s=s.replace('<script type="importmap">','<link rel="stylesheet" href="pricing.css?v=ratebook-1">\n<script type="importmap">')
if 'src="pricing.js' not in s:s=s.replace('<script type="module" src="app.js?v=content-1"></script>','<script type="module" src="app.js?v=content-1"></script>\n<script type="module" src="pricing.js?v=ratebook-1"></script>')
index_file.write_text(s)

price_file = DIST/'pricing.html'
s = price_file.read_text()
rules = re.search(r'<section class="section-pad price-rules".*?</section>',s,re.S).group()
contact = re.search(r'<section class="contact-section.*?</section>',s,re.S).group()
intro = '''<section class="rate-hero section-pad" aria-labelledby="pricing-title"><div><p class="mono red-text">THE RED STUDIO / RATE BOOK</p><h1 id="pricing-title">Your next move.<br><span>In numbers.</span></h1><p class="page-lead">Seven ways to start. Clear scopes, real deliverables<br>and prices you can see before we meet.</p></div><div class="rate-stamp" aria-hidden="true"><svg viewBox="0 0 220 220"><defs><path id="stamp-circle" d="M110,110m-86,0a86,86 0 1,1 172,0a86,86 0 1,1 -172,0"/></defs><text><textPath href="#stamp-circle">FIXED SCOPE · CLEAR PRICE · THE RED STUDIO · </textPath></text></svg><span>01<span>—</span>07</span><i>NOK / NORWAY</i></div></section>'''
vat = '''<div class="rate-toolbar"><p id="vat-status" class="mono" role="status">ALL PRICES IN NOK / EXCLUDING VAT</p><div class="vat-switch" role="group" aria-label="Show prices with or without VAT"><button data-vat="0" aria-pressed="true">Excl. VAT</button><button data-vat="1" aria-pressed="false">Incl. 25% VAT</button></div></div>'''
catalog = '<section class="rate-catalog section-pad" aria-label="Fixed-scope design packages">'+vat+ratebook(plans)+'''<p class="rate-scope-note">Prices apply to the scope shown, one consolidated brief and feedback from one decision-maker. Timelines begin once the brief and assets are ready. VAT applies where required and is confirmed in the written quote.</p></section>'''
builder = '''<section class="estimate-section section-pad" id="build-estimate" aria-labelledby="estimate-title"><div class="section-kicker mono"><span>BUILD A PROJECT</span><span>YOUR IDEA / YOUR COMBINATION</span></div><div class="estimate-heading"><h2 id="estimate-title">A little of this.<br><span>A little of that.</span></h2><p>Choose the scopes you need.<br>See an itemised package estimate.</p></div><div class="estimate-layout"><div class="estimate-options" role="group" aria-label="Packages for your estimate">'''+''.join(f'''<label class="estimate-option"><input type="checkbox" name="estimate-package" value="{p['id']}"><span class="estimate-check" aria-hidden="true">+</span><span class="estimate-option-name">{p['name']}</span><span class="estimate-option-cost"><span data-price="{p['price']}">{format_price(p['price'])}</span><small>NOK</small></span></label>''' for p in plans)+'''<p class="estimate-combination-note" role="status">Brand identity includes Logo essentials. Choose one of those two.</p></div><aside class="estimate-receipt" aria-labelledby="estimate-receipt-title"><div class="receipt-head mono"><span>THE RED STUDIO</span><span>PROJECT ESTIMATE</span></div><h3 id="estimate-receipt-title">Made for<br>your next move.</h3><p class="mono receipt-items-label">PACKAGE PRICES / EXCLUDING VAT</p><div class="estimate-line-items"><p class="estimate-empty">Pick a package on the left.<br>We’ll add it to your estimate.</p></div><div class="receipt-totals"><div><span>Package subtotal</span><span data-estimate-subtotal>0 NOK</span></div><div><span>VAT, if applicable (25%)</span><span data-estimate-vat>0 NOK</span></div></div><div class="receipt-total-label mono">ESTIMATED TOTAL <span data-estimate-tax-label>EXCL. VAT</span></div><p class="estimate-amount"><span data-estimate-total aria-hidden="true">0</span><small>NOK</small></p><p class="sr-only" data-estimate-announcement role="status">No packages selected.</p><a class="estimate-cta" aria-disabled="true" href="index.html#contact">Discuss this combination <span>↗</span></a><p class="receipt-disclaimer">An estimate for these separate scopes. We’ll confirm overlap, timing and the final quote together. No payment is taken here.</p><div class="receipt-barcode" aria-hidden="true"></div><span class="mono receipt-footer">DESIGN & MARKETING / TRONDHEIM</span></aside></div></section>'''
support = '''<section class="rate-support section-pad" id="ongoing"><div class="support-hours" aria-hidden="true">20<span>h</span></div><div class="support-copy"><p class="mono">ONGOING DESIGN SUPPORT</p><h2>A place on<br>your team.</h2><p>20 hours a month for recurring design and campaign work.<br>A shared queue, one active task, and an itemised time report.</p><a href="index.html?package=ongoing#contact" class="support-link">Discuss ongoing support <span>↗</span></a></div><div class="support-price"><p><span data-price="22000">22,000</span><small>NOK / MONTH</small></p><span class="mono" data-tax-label>EXCLUDING VAT</span><ul><li>Renew monthly. No long-term lock-in.</li><li>Unused hours expire at month-end.</li><li>Extra hours approved at <span data-price="1200">1,200</span> NOK/hour.</li></ul></div></section>'''
body=intro+catalog+builder+support+rules+config_markup+contact
s=re.sub(r'<main id="main">.*?</main>',lambda m:'<main id="main">'+body+'</main>',s,count=1,flags=re.S)
s=s.replace('class="content-page"','class="content-page pricing-page"')
if 'pricing.css' not in s:s=s.replace('<script defer src="page.js?v=content-1"></script>','<link rel="stylesheet" href="pricing.css?v=ratebook-1"><script defer src="vendor/gsap.min.js"></script><script defer src="page.js?v=content-1"></script><script type="module" src="pricing.js?v=ratebook-1"></script>')
price_file.write_text(s)
print('Generated the homepage rate book, package catalogue and estimate builder.')
