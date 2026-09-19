#!/usr/bin/env python3
"""
Makes web-sized copies of everything in media/images/ and refreshes the album
list in data/messages.json.

    python3 tools/prepare-photos.py

Originals in media/images/ are never touched. For each photo two copies are
written — a thumbnail for the album strip and a larger one for the full-screen
viewer — with EXIF rotation applied and all metadata (including GPS) stripped.

Photos named after a person (Amalka.jpeg, Vojta_Doni.jpg) belong to that
person's message, and title_image.jpg heads the page; those are left out of
the album. Everything else goes in it, oldest first. Captions already written
in data/messages.json are kept.
"""

import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'media' / 'images'
THUMBS = ROOT / 'media' / 'web' / 'thumb'
LARGE = ROOT / 'media' / 'web' / 'large'
DATA = ROOT / 'data' / 'messages.json'

SUFFIXES = {'.jpg', '.jpeg', '.png'}
THUMB_EDGE = 720
LARGE_EDGE = 1920

# This one goes under the name at the top of the page, not in the album.
HERO = 'title_image'

# Filenames that are a person's photo → the id of their entry in messages.json.
# Ids are matched, not names, so renaming someone on the page changes nothing here.
PORTRAITS = {
    'Amalka':        'amalka',
    'Cinda':         'cinda',
    'David':         'david',
    'Kryštof_Tade':  'krystof-tade',
    'vojta':         'vojta',
    'Vojta_Doni':    'vojta-doni',
}


def slug(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', text.lower())).strip('-')


def taken_at(path, img):
    """EXIF capture time, else a date in the filename, else the file's own date."""
    exif = img.getexif()
    for tag in (36867, 36868, 306):          # DateTimeOriginal, Digitized, DateTime
        raw = exif.get(tag)
        if raw:
            try:
                return datetime.strptime(str(raw)[:19], '%Y:%m:%d %H:%M:%S')
            except ValueError:
                pass
    digits = re.sub(r'\D', '', path.stem)
    for size, fmt in ((14, '%Y%m%d%H%M%S'), (8, '%Y%m%d')):
        if len(digits) >= size:
            try:
                return datetime.strptime(digits[:size], fmt)
            except ValueError:
                pass
    return datetime.fromtimestamp(path.stat().st_mtime)


def save(img, path, edge, quality):
    copy = img.copy()
    copy.thumbnail((edge, edge), Image.LANCZOS)
    if copy.mode not in ('RGB', 'L'):
        copy = copy.convert('RGB')
    path.parent.mkdir(parents=True, exist_ok=True)
    copy.save(path, 'JPEG', quality=quality, optimize=True, progressive=True)
    return copy.size


def record_fields(record):
    return {k: record[k] for k in ('src', 'thumb', 'width', 'height')}


def main():
    photos = sorted(p for p in SOURCE.iterdir() if p.suffix.lower() in SUFFIXES)
    album, portraits, hero = [], {}, None

    for path in photos:
        name = slug(path.stem) or 'photo'
        with Image.open(path) as raw:
            img = ImageOps.exif_transpose(raw)
            when = taken_at(path, raw)
            thumb = THUMBS / f'{name}.jpg'
            large = LARGE / f'{name}.jpg'
            save(img, thumb, THUMB_EDGE, 78)
            width, height = save(img, large, LARGE_EDGE, 82)

        record = {
            'src': str(large.relative_to(ROOT)),
            'thumb': str(thumb.relative_to(ROOT)),
            'width': width,
            'height': height,
        }
        if path.stem == HERO:
            hero = record
        elif path.stem in PORTRAITS:
            portraits[PORTRAITS[path.stem]] = record
        else:
            album.append((when, record))

    data = json.loads(DATA.read_text())

    # Keep captions and alt text that were written by hand.
    written = {a.get('src'): a for a in data.get('album', [])}
    ordered = []
    for _, record in sorted(album, key=lambda pair: pair[0]):
        for field in ('caption', 'alt'):
            if written.get(record['src'], {}).get(field):
                record[field] = written[record['src']][field]
        ordered.append(record)
    data['album'] = ordered

    if hero:
        kept = data.get('heroImage') or {}
        data['heroImage'] = {**record_fields(hero), 'alt': kept.get('alt', '')}

    # Point each person's entry at their own photo.
    for entry in data.get('entries', []):
        record = portraits.get(entry.get('id'))
        if record:
            media = entry.setdefault('media', {}) or {}
            media.update({'type': 'image', 'src': record['src']})
            entry['media'] = media

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(photos)} photos → {len(ordered)} in the album, '
          f'{len(portraits)} portraits, '
          f'{"a" if hero else "no"} title image')


if __name__ == '__main__':
    main()
