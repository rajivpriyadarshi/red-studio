"""Render the homepage's compact audience directory and preserve audience links."""
from html import escape
from pathlib import Path
import re

audiences = [
    ("researchers", "Research groups", "Figures, conference posters and websites that explain what you found."),
    ("engineers", "Engineers and makers", "Diagrams, interfaces and demo films that show a prototype at work."),
    ("businesses", "Businesses", "Logos, websites and a design kit your team can use."),
    ("artists", "Bands and artists", "Record sleeves, gig posters and films for a release."),
    ("everyone", "Early ideas", "Bring a sketch or a rough brief. We’ll work out what to make first."),
]
entries = "".join(
    f'<p id="audience-{key}"><strong>{escape(title)}</strong>{escape(description)}</p>'
    for key, title, description in audiences
)
page = Path(__file__).resolve().parents[1] / "dist/index.html"
html, count = re.subn(
    r'(<div id="for-you" class="audience-note"><details><summary>Who we work with</summary><div class="audience-list">).*?(</div></details></div>)',
    lambda match: match[1] + entries + match[2],
    page.read_text(), count=1, flags=re.S,
)
if count:
    page.write_text(html)
else:
    print("This edition presents the team directly and has no audience directory.")
