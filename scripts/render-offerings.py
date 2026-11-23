"""Set the homepage service choices and matching project enquiry options."""
from html import escape
from pathlib import Path
import json
import re

# The motion study is one of the original drawn forms: sound (0), film (1), design (2).
dist = Path(__file__).resolve().parents[1] / "dist"
groups = json.loads((dist / "pricing-data.json").read_text())["serviceGroups"]
services = {
    "brand": (2, "Logos & templates", "Original logos and reusable templates for research projects, brands, bands and new ventures."),
    "campaigns": (2, "Posters & print", "Conference posters, band posters and printed project profiles. We design for the size, paper and place you have in mind."),
    "digital": (2, "Websites", "We design and build websites that help people find your work and get in touch."),
    "apps": (2, "App UI/UX design", "We map what people need to do in your app, design the screens and build a clickable prototype you can try before development."),
    "video": (1, "Video & photo editing", "We edit photos, cut short films for social media and shape longer stories from your footage."),
    "sound": (0, "Sound & sonic branding", "A sound people recognise as yours. We create sonic logos, soundtracks and original sound design for films, games and apps."),
}

choices, options = [], []
first = groups[0]["services"][0]
for group in groups:
    group_id = "discipline-" + group["services"][0]
    choices.append(f'<div class="channel-group" role="group" aria-labelledby="{group_id}"><h3 id="{group_id}">{escape(group["name"])}</h3>')
    for key in group["services"]:
        shape, label, copy = services[key]
        label = escape(label)
        choices.append(f'<button type="button" class="channel" id="example-{key}" data-channel="{key}" data-shape="{shape}" data-heading="{label}" data-copy="{escape(copy)}" aria-pressed="{str(key == first).lower()}">{label}</button>')
        options.append(f'<label><input type="checkbox" name="services" value="{label}"><span>{label}</span></label>')
    choices.append('</div>')

page = dist / "index.html"
def replace_once(html, pattern, replacement):
    result, count = re.subn(pattern, lambda _: replacement, html, flags=re.S)
    assert count == 1, pattern
    return result


html = replace_once(page.read_text(), r'<!-- service-choices -->.*?(?=\n</div><div class="scope-monitor")',
                    '<!-- service-choices -->\n' + '\n'.join(choices))
html = replace_once(html, r'<h3 id="channel-title">.*?</p>',
                    f'<h3 id="channel-title">{escape(services[first][1])}</h3><p id="channel-copy">{escape(services[first][2])}</p>')
html = replace_once(html, r'<div class="service-options">.*?</div></fieldset>',
                    '<div class="service-options">' + ''.join(options) + '</div></fieldset>')
page.write_text(html)
