"""Typeset the price press and its accessible package scopes from studio rates."""
from html import escape
from pathlib import Path
import json
import re

dist = Path(__file__).resolve().parents[1] / "dist"
rates = json.loads((dist / "pricing-data.json").read_text())
plans = rates["packages"] + [{
    "id": "ongoing", "name": "Ongoing support", "price": 22000, "time": "20 hours / month",
    "fit": "A monthly block of studio time for your team.",
    "items": ["20 hours of design, reports or communication work", "One task at a time and an itemised time report", "Billed monthly in advance. Unused hours expire at month-end."],
    "excludes": "Unused hours and any third-party costs.",
}]
labels = {"logo":"Logo","identity":"Identity kit","website":"Website","product":"App design","campaign":"Print & slides","motion":"Animation","video":"Film edit","sound":"Sound","ongoing":"Monthly"}
palette = ["#ffbfcb","#f2c983","#eab2fe","#b1e7f6","#bde1af","#f8a2b4","#ffd3a1","#e6c3fc","#f0e6c6"]
keys, tickets = [], []
for i, (plan, color) in enumerate(zip(plans, palette)):
    key = plan["id"]
    name, time = escape(plan["name"]), escape(plan["time"])
    price = f'{plan["price"]:,}'.replace(",", "\u2009")
    number = str(i+1).zfill(2)
    keys.append(f'<a class="press-key" data-rate-key="{key}" href="#price-{key}"><i>{number}</i>{escape(labels[key])}</a>')
    items = "".join(f"<li>{escape(item)}</li>" for item in plan["items"])
    process_link = '<p><a href="#process">See our logo process ↓</a></p>' if key == "logo" else ""
    tickets.append(f'''<article class="quote" id="price-{key}" data-plan="{key}" data-price="{plan['price']}" data-paper="{color}">
<h3>{name}</h3><p>{escape(plan['fit'])}</p><details class="scope-detail" open><summary>What’s included</summary><ul>{items}</ul><p><b>Quoted separately.</b> {escape(plan["excludes"])}</p>{process_link}</details>
<p class="plain-rate">{price} NOK · {time} · excl. VAT</p>
<button class="ask-rate" data-inquiry data-package="{name}">Enquire about this package ↗</button></article>''')
panel = f'''<div class="press-layout">
<div class="ticket-machine">
<div class="press-console"><div class="press-face">
<div class="machine-top"><span class="cast-mark" aria-hidden="true">red.</span><span class="air-grille" aria-hidden="true"></span><button type="button" class="sound-switch press-sound" aria-label="Printer sound" aria-pressed="true" hidden>Printer sound</button></div>
<nav class="key-bank" aria-label="Choose a package to print">{''.join(keys)}</nav>
<div class="press-hardware" aria-hidden="true"><span class="status-lamp"></span><div class="machine-display"><span>№</span> <b data-machine-number>01</b></div></div>
</div><div class="press-mouth" aria-hidden="true"><i class="feed-drum"></i><i class="cut-blade"></i></div></div>
<div class="ticket-bed" aria-hidden="true"><div class="paper-entry"><div class="paper-feed">
<div class="ticket" style="--paper-color:{palette[0]}">
<div class="ticket-main"><div class="ticket-brand">The Red Studio</div><div class="ticket-art"><div class="foil-still"></div><canvas></canvas></div>
<div class="ticket-lower"><b data-ticket-title>{escape(plans[0]['name'])}</b><div class="ticket-fee"><strong data-ticket-price>{plans[0]['price']:,}</strong><span>NOK</span></div></div>
<div class="ticket-bottom"><span data-ticket-time>{escape(plans[0]['time'])}</span><span>Excl. VAT</span></div></div><div class="ticket-stub"><span>TRONDHEIM</span><i></i><b data-ticket-no>01</b></div></div></div></div></div></div>
<div class="quote-stock" aria-live="polite">{''.join(tickets)}</div></div>
<div class="terms"><div id="independent"><b>Independent rate.</b> Self-funded bands and independent brands can ask for a reduced fee.</div>
<details><summary>Payment &amp; terms</summary><p>Half at kickoff, half before handoff. We agree a cap in advance for extra work at {rates['hourlyRate']:,} NOK per hour. We confirm licences, outside costs and the rights to the finished work with you in writing.</p></details></div>'''
page = dist / "index.html"
updated, count = re.subn(r'<!-- pricing start -->.*?<!-- pricing end -->',lambda _: '<!-- pricing start -->\n'+panel+'\n<!-- pricing end -->',page.read_text(),flags=re.S)
assert count == 1
page.write_text(updated)
