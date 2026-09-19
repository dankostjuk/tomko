# Congratulations page

One page. Each person who wrote a congratulation gets a section: their name, their
message, and optionally a photo or a video. Sections alternate — the first name sits to
the right, the next to the left, separated by a hairline rule — and the message itself
is always set to the right of its column. Every other photograph goes in the album at
the foot of the page.

Plain HTML, CSS and JavaScript. No build step, no framework — just one script that
makes web-sized copies of the photographs.

## Run it

| How | Command |
| --- | --- |
| Node (included server) | `npm start` → http://localhost:8000 |
| Python | `python3 -m http.server 8000` |
| IntelliJ | Right-click `index.html` → **Open in Browser** |

Don't open `index.html` by double-clicking it in the file manager — browsers block
`fetch()` on `file://` URLs, so the messages won't load.

## Where things are

```
tomko/
├── index.html              page shell
├── css/styles.css          all styling
├── js/app.js               builds the page from the JSON
├── data/messages.json      ← everything you edit lives here
├── media/
│   ├── images/             the original photographs (never shown directly)
│   ├── web/                web-sized copies — thumb/ and large/ — made by the script
│   ├── videos/             video files
│   ├── posters/            still frames shown before a video plays
│   └── decor/              the sakura branches in the page corners
├── tools/prepare-photos.py resizes the photos, refreshes the album list
├── serve.js                dev server (supports video seeking)
└── package.json            `npm start`
```

## The photographs

Drop them in `media/images/` at whatever size the camera made them, then run:

```bash
python3 tools/prepare-photos.py
```

It writes a thumbnail and a screen-sized copy of each one into `media/web/`, turning
them the right way up and stripping the metadata (including GPS) on the way, and
rewrites the `album` list in `data/messages.json`. The originals are never touched, and
captions you have already written are kept.

**A photo named after a person** — `Amalka.jpeg`, `Vojta_Doni.jpg` — is that person's
photo and goes next to their message instead of in the album. `PORTRAITS` at the top of
the script maps each such filename to the `id` of that person's entry — ids, not names,
so you can rename anyone on the page without breaking the link. Add a line there when a
new one arrives.
**`title_image.jpg`** is the photograph under the name at the top of the page (`HERO`
in the script). Everything else lands in the album, oldest first, dated from the
photo's own EXIF data or from its filename.

## Adding a congratulation

1. Put the photo in `media/images/` (then run the script above) or the video in
   `media/videos/`.
2. Add an object to `entries` in `data/messages.json`:

```json
{
  "id": "anna",
  "name": "Anna",
  "relation": "from the office",
  "text": "First line.\nSecond line.\n\nA new paragraph.",
  "italic": false,
  "media": {
    "type": "image",
    "src": "media/web/large/anna.jpg",
    "caption": "Summer 2025",
    "alt": "Anna and Tomkus at the lake"
  }
}
```

3. Reload. The section is added at the end of the page, on the opposite side from the
   one before it.

### Entry fields

| Field | Required | What it does |
| --- | --- | --- |
| `name` | yes | the heading of the section — the person who wrote it |
| `text` | yes | the message; `\n` starts a new line, a blank line (`\n\n`) a new paragraph |
| `italic` | no | `true` sets that person's message in italic |
| `relation` | no | small italic line under the name, e.g. "from the office" |
| `media` | no | one photo or video; leave it out and the message stands alone |
| `side` | no | `"right"` or `"left"` to force which side the name sits on |
| `id` | no | the section's anchor, e.g. `index.html#anna`; defaults to the name |

### Media fields

| Field | What it does |
| --- | --- |
| `type` | `"image"`, `"video"` or `"text"` |
| `src` | image and video — path from the project root, e.g. `media/videos/peter.mp4` |
| `text` | text only — words set in a paper card where the photo would be |
| `poster` | video only — the frame shown before play |
| `caption` | small line under the photo |
| `alt` | image only — description for screen readers |

**A card of words instead of a photo.** When someone has no photograph, `"type": "text"`
puts their message in the photo's place, on the opposite side from their name:

```json
{
  "id": "ondra-dan",
  "name": "Ondra & Dan",
  "text": "",
  "italic": true,
  "media": { "type": "text", "text": "First line\nSecond line" }
}
```

`text` on the entry stays empty — the words live in the card. `italic` sets both.

Sides alternate automatically in the order the entries appear in the file, so reorder
the array to reorder the page. Below 820px wide there are no sides at all: the name,
the message and then the photo stack in one column, and the message goes back to being
left-aligned so it stays easy to read on a phone.

### The album

Everything in the `album` list in `data/messages.json` is laid out as a strip below the
messages that scrolls sideways — drag it, use the arrows at either end, or click a
photo to open it full screen and walk through the set with ← and →. The script fills
this list in; the only thing worth editing by hand is a `caption` or an `alt`, and those
survive the next run.

| Field | What it does |
| --- | --- |
| `src` | the big copy, shown full screen |
| `thumb` | the small copy, shown in the strip |
| `width`, `height` | the big copy's size, so the strip reserves the right shape |
| `caption` | optional line under the photo in the viewer |
| `alt` | optional description for screen readers |

`albumTitle` and `albumNote` at the top of the file set the heading and the line under
it; empty either one and it goes away. Empty the `album` list and the whole section
disappears.

### Page header and footer

The top of `data/messages.json` sets the wording:

```json
"greeting":  "Congratulations,",
"honoree":   "Tomkus",
"intro":     "",
"closing":   "Written by the people who know you.",
"heroImage": { "src": "media/web/large/title-image.jpg", "alt": "Tomkus" }
```

`heroImage` is the photograph under the name; the script fills it in from
`title_image.jpg`. `intro` is a line of text in the same place — write one and it
appears above the photograph, leave it empty and it disappears. Remove `heroImage`
and the top of the page is just the name.

### Making a poster from a video

```bash
ffmpeg -i media/videos/peter.mp4 -ss 00:00:02 -vframes 1 media/posters/peter.jpg
```

## Changing the look

All colours and typefaces are variables at the top of `css/styles.css`:

```css
--paper:     #fbf6f2;   /* washi page background   */
--paper-top: #fdeef0;   /* sakura tint at the top  */
--mat:       #fffdfb;   /* photo mat               */
--ink:       #2f2724;   /* sumi — body text        */
--ink-soft:  #857773;   /* captions, meta          */
--name:      #2b4c6f;   /* indigo — people's names */
--seal:      #c0554a;   /* vermilion — the 祝 seal */
--rule:      #e6d8d2;   /* hairline between people */
--petal:     #f2b8c6;   /* the sakura petals       */
```

Typefaces are Shippori Mincho (names, heading) and Zen Kaku Gothic New (message text),
loaded from Google Fonts in `index.html`. Both fall back to system fonts if there's no
internet.

### The sakura

Branches lean in from three corners — top left, top right and bottom right — as the
`<div class="branches">` near the top of `index.html`. They are two drawings in
`media/decor/`, reused and flipped by the `.branch-tl` / `.branch-tr` / `.branch-br`
rules in `styles.css`; change a `width` there to make one bigger, or drop the `<img>`
to remove it. The top-right one is hidden on narrow screens.

Petals fall in a fixed layer behind the page — the `<div class="sakura">` of empty
`<span>`s at the top of `index.html`, animated entirely in CSS. Each petal's lane, size,
speed and head start are the `:nth-child` rules in the *Sakura* block of `styles.css`;
add or remove a `<span>` and add or remove the matching rule. The petal shape itself is
the `--petal-svg` variable, also used for the small petal on each hairline. The whole
layer is hidden for anyone who has asked for reduced motion.

## IntelliJ notes

- **File → Open** and pick the `tomko` folder.
- The built-in server serves it at `http://localhost:63342/tomko/index.html`.
- With `index.html` open, the browser icons in the top-right corner of the editor
  launch the page.

## Placeholder content

The four entries in `data/messages.json` (Anna, Peter, Mária, Jakub), the generated
SVG images and the test video are placeholders. Delete them as you add real messages.
