"""Keep the enquiry form in the same service order as the price board."""
from html import escape
import json
from pathlib import Path
import re

dist = Path(__file__).resolve().parents[1] / "dist"
groups = json.loads((dist / "pricing-data.json").read_text())["serviceGroups"]
labels = {
    "brand": "Logos & templates", "campaigns": "Posters & print",
    "digital": "Websites", "apps": "App UI/UX design",
    "video": "Video & photo editing", "sound": "Sound & sonic branding",
}
options = []
for group in groups:
    for key in group["services"]:
        label = escape(labels[key])
        options.append(f'<label><input type="checkbox" name="services" value="{label}"><span>{label}</span></label>')
page = dist / "index.html"
html, count = re.subn(r'<div class="service-options">.*?</div></fieldset>',
                      lambda _: '<div class="service-options">' + ''.join(options) + '</div></fieldset>',
                      page.read_text(), flags=re.S)
assert count == 1
page.write_text(html)
