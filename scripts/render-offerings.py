"""Typeset the three disciplines on the studio homepage."""
from pathlib import Path
from html import escape
import re
services = [
    ("sound", "Sound", "Sound design", "Original sonic logos, soundtracks and sound for games, films and apps."),
    ("video", "Film", "Film & editing", "Event films, interviews and short-form cuts. We edit the story, grade the colour and mix the sound."),
    ("brand", "Design", "Graphic & digital design", "Logos, visual systems, websites and app interfaces. From the first pencil sketch to files ready for use."),
]
links = []
for key, label, title, copy in services:
    links.append(f'<button class="channel" id="example-{key}" data-channel="{key}" data-heading="{title}" data-copy="{escape(copy)}" aria-pressed="{str(key=="sound").lower()}">{label}<span aria-hidden="true">↗</span></button>')
page = Path(__file__).resolve().parents[1] / "dist/index.html"
html,count = re.subn(r'<!-- service-choices -->.*?(?=\n</div><div class="scope-monitor")', lambda _: '<!-- service-choices -->\n'+'\n'.join(links),page.read_text(),flags=re.S)
assert count == 1
page.write_text(html)
