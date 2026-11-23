"""Set the Trondheim fare board and its package scopes from the studio's rates."""
from html import escape
from pathlib import Path
import json
import re

dist = Path(__file__).resolve().parents[1] / "dist"
rates = json.loads((dist / "pricing-data.json").read_text())
groups = rates["serviceGroups"]
service_groups = {service: group["name"] for group in groups for service in group["services"]}
rows = {group["name"]: [] for group in groups}
service_order = {service: index for index, service in enumerate(service_groups)}
plans = sorted(rates["packages"], key=lambda plan: service_order[plan["service"]])
# The long and short edits share a film engraving, on different paper.
stock = {
    "logo": ("Logo", "#f1bd84", "logo", 0, "Logo construction sketches and a pencil study of a coastal mark."),
    "identity": ("Comms kit", "#eebb9e", "identity", 1, "Studies for a poster, slide and folded newsletter with colour swatches."),
    "website": ("Website", "#baddee", "website", 2, "A desktop wireframe and its mobile layout."),
    "motion": ("Logo in motion", "#f5a67a", "motion", 7, "Four logo-animation keyframes. A red dot stretches into a mountain mark and settles on a sound accent."),
    "video": ("Short edit", "#dfc68a", "video", 6, "A three-shot vertical storyboard for a coffee film. Ice drops into a glass, espresso pours, and a hand slides the finished drink into view."),
    "product": ("App UI/UX", "#b5c7db", "product", 2, "A wireframe study comparing a desktop screen and a phone screen."),
    "campaign": ("Print design", "#dac3a4", "campaign", 1, "Pencil layouts for a poster and other printed pieces."),
    "photo": ("Photo edit", "#dfc8ca", "video", 4, "Framing studies for a sequence of portraits and details."),
    "sound": ("Sound design", "#cec1df", "sound", 3, "A pencil study of timing and a sound waveform."),
    "long-video": ("Long edit", "#b9d39d", "video", 5, "Four documentary storyboard frames. Enter the restaurant, cut to the chef plating a dumpling, meet a guest, then pull back to the table. The voices carry across the cut."),
}

def amount(price):
    return f"{price:,}".replace(",", "\u202f")

quotes = []
for i, plan in enumerate(plans, 1):
    key, name, price = plan["id"], escape(plan["name"]), plan["price"]
    title, color, art, study, sketch = stock[key]
    fee = f"{amount(price)} {rates['currency']}" if price is not None else "On request"
    board_fee = f'{amount(price)}<span class="sr-only"> {rates["currency"]}</span>' if price is not None else fee
    note = ""
    if "workload" in plan:
        note = f"Estimated work · {plan['workload']}"
    elif "length" in plan:
        note = f"Finished film · {plan['length']}"
    meta = " · ".join(filter(None, [fee + (" excl. VAT" if price is not None else ""), note]))
    if i == 1:
        first_key, first_title, first_color, first_art = key, title, color, art
        first_fee, first_note, first_sketch = fee, note, sketch
        first_tax = " hidden" if price is None else ""
    number = f"{i:02}"
    rows[service_groups[plan["service"]]].append(f'''<a class="fare-row" data-rate-key="{key}" href="#price-{key}">
<span class="fare-number" aria-hidden="true">{number}</span><span>{name}</span><span class="fare-price">{board_fee}</span></a>''')
    items = "".join(f"<li>{escape(item)}</li>" for item in plan["items"])
    process = '<p><a href="#process">See our logo process ↓</a></p>' if key == "logo" else ""
    quotes.append(f'''<article class="fare-quote" id="price-{key}" data-plan="{key}" data-art="{art}" data-study="{study}" data-sketch="{escape(sketch)}" data-price="{price if price is not None else ''}" data-fee="{fee}" data-paper="{color}" data-ticket-name="{title}" data-note="{note}">
<h3>{name}</h3><p class="fare-fit">{escape(plan['fit'])}</p><p class="fare-meta">{meta}</p>
<button type="button" class="scope-opener" aria-haspopup="dialog" aria-controls="package-scope" hidden>What’s included <span aria-hidden="true">↗</span></button>
<div class="fare-scope"><h4>What’s included</h4><ul>{items}</ul>{process}</div></article>''')

board = []
for group_name, links in rows.items():
    board.append(f'<div class="fare-group"><h3>{escape(group_name)}</h3>')
    board.extend(links)
    board.append('</div>')

panel = f'''<div class="fare-layout">
<div class="fare-board"><div class="fare-legend" aria-hidden="true"><span>Service</span><span>Indicative fee (NOK)</span></div>
{chr(10).join(board)}</div>
<div class="fare-display">
<div class="counter-scene">
<canvas class="press-viewport" tabindex="-1" role="button" aria-describedby="press-sketch-caption" aria-label="3D ticket printer and spiral sketchpad. Drag or use the left and right arrow keys to turn it. Pinch, scroll or use plus and minus to zoom. Press 0 to reset the zoom. Tap or press Enter to print again." aria-keyshortcuts="ArrowLeft ArrowRight Enter Space Plus - 0"></canvas>
<span class="sr-only" id="press-sketch-caption">{first_sketch}</span>
<div class="press-proof" aria-hidden="true">
<div class="flat-sketchbook"><img src="assets/ticket-window/pad-studies.webp?v=storyboards-1" loading="lazy" decoding="async" alt=""></div>
<div class="fare-paper" data-stock="{first_key}" style="--stock:{first_color}">
<div class="paper-issuer">The Red Studio<span>Trondheim</span></div>
<div class="paper-value"><b data-ticket-title>{first_title}</b><div><strong data-ticket-price>{first_fee}</strong></div></div>
<img class="paper-plate" data-ticket-art src="assets/ticket-window/{first_art}.webp" width="480" height="480" alt="">
<div class="paper-foot"><span data-ticket-time>{first_note}</span><span data-ticket-tax{first_tax}>Excl. VAT</span></div>
<div class="paper-coupon"><span>TRD</span><b data-ticket-no>01</b><i></i></div>
</div></div>
<button class="sound-switch press-sound" type="button" aria-label="Ticket sound" aria-pressed="true" hidden>Ticket sound</button>
</div>
<div class="fare-scopes">{''.join(quotes)}</div>
</div></div>
<dialog class="scope-dialog" id="package-scope" aria-labelledby="scope-name">
<div class="scope-card">
<button type="button" class="scope-close" aria-label="Close package details" autofocus><span aria-hidden="true">×</span></button>
<div class="scope-scroll">
<header class="scope-head"><h2 id="scope-name"></h2><p class="scope-meta"></p><img class="scope-art" width="130" height="130" alt=""></header>
<div class="scope-body"></div>
<footer class="scope-foot"><button type="button" class="scope-enquiry">Discuss this package <span aria-hidden="true">↗</span></button></footer>
</div></div></dialog>
<p class="sr-only" data-fare-status role="status"></p>
<div class="terms"><div id="independent"><b>Independent rate.</b> Self-funded bands and independent brands can ask for a reduced fee.</div>
<details><summary>Payment &amp; terms</summary><p>Half at kickoff, half before handoff. We agree the scope and cost of any extra work with you in advance. We confirm licences, outside costs and the rights to the finished work with you in writing.</p></details></div>'''
page = dist / "index.html"
updated, count = re.subn(r'<!-- pricing start -->.*?<!-- pricing end -->', lambda _: '<!-- pricing start -->\n' + panel + '\n<!-- pricing end -->', page.read_text(), flags=re.S)
assert count == 1
page.write_text(updated)
