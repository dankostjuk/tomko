/**
 * Builds the page from data/messages.json.
 * Every entry is one person's congratulation; sides alternate down the page.
 */

const DATA_URL = 'data/messages.json';

const $entries = document.getElementById('entries');
const $loading = document.getElementById('loading');
const $viewer = document.getElementById('viewer');
const $viewerImage = document.getElementById('viewerImage');
const $viewerCaption = document.getElementById('viewerCaption');
const $viewerCount = document.getElementById('viewerCount');
const $viewerPrev = document.getElementById('viewerPrev');
const $viewerNext = document.getElementById('viewerNext');
const $album = document.getElementById('album');
const $albumStrip = document.getElementById('albumStrip');

// The photos the viewer is currently flipping through, and where it is.
let reel = [];
let reelIndex = 0;

init();

async function init() {
  let data;
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    data = await res.json();
  } catch (err) {
    $loading.className = 'failed';
    $loading.innerHTML =
      `Could not read <code>${DATA_URL}</code> — ${escapeHtml(err.message)}.<br>` +
      `Open the page through a web server (<code>npm start</code>), not as a <code>file://</code> path.`;
    return;
  }

  const entries = (data.entries ?? []).filter((e) => e.name || e.text);
  $loading.remove();

  renderHero(data);
  renderEntries(entries);
  renderAlbum(data);
  renderClosing(data, entries);

  document.getElementById('viewerClose').addEventListener('click', () => $viewer.close());
  $viewer.addEventListener('click', (e) => {
    if (e.target === $viewer) $viewer.close();
  });

  $viewerPrev.addEventListener('click', () => showPhoto(reelIndex - 1));
  $viewerNext.addEventListener('click', () => showPhoto(reelIndex + 1));
  $viewer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(reelIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(reelIndex + 1); }
  });
}

function renderHero(data) {
  const greeting = data.greeting ?? 'Congratulations,';
  document.title = data.headline ?? `${greeting} ${data.honoree ?? ''}`.trim();

  document.getElementById('heroGreeting').textContent = greeting;
  document.getElementById('heroName').textContent = data.honoree ?? 'Tomko';

  const $intro = document.getElementById('heroIntro');
  $intro.textContent = data.intro ?? '';
  if (!$intro.textContent) $intro.remove();

  renderHeroPhoto(data.heroImage);
}

/** The photograph under the name, if there is one. */
function renderHeroPhoto(photo) {
  const $photo = document.getElementById('heroPhoto');
  const src = photo && (photo.src ?? photo.thumb);
  if (!src) {
    $photo.remove();
    return;
  }

  $photo.hidden = false;
  $photo.innerHTML = mediaHtml({ type: 'image', ...photo, src });
  $photo.querySelector('[data-full]').addEventListener('click', () =>
    openViewer([{ src, caption: photo.caption ?? '', alt: photo.alt ?? '' }], 0));
}

function renderEntries(entries) {
  $entries.innerHTML = entries.map(entryHtml).join('');

  // The photos that came with a message are one reel, so you can flip
  // straight from one person to the next.
  const photos = [...$entries.querySelectorAll('[data-full]')];
  const reelOfEntries = photos.map((btn) => ({
    src: btn.dataset.full,
    caption: btn.dataset.caption,
    alt: btn.dataset.alt,
  }));
  photos.forEach((btn, i) => {
    btn.addEventListener('click', () => openViewer(reelOfEntries, i));
  });
}

function entryHtml(entry, i) {
  // Odd entries mirror: first name keeps its side on the right.
  const side = entry.side ?? (i % 2 === 0 ? 'right' : 'left');
  const mirrored = side === 'left' ? ' is-mirrored' : '';

  const italic = entry.italic ? ' is-italic' : '';

  return `
    <article class="entry${mirrored}${italic}" id="${slug(entry, i)}">
      <div class="entry-text">
        <h2 class="entry-name">${escapeHtml(entry.name ?? '')}</h2>
        ${entry.relation ? `<p class="entry-relation">${escapeHtml(entry.relation)}</p>` : ''}
        <div class="entry-message">${paragraphs(entry.text ?? '')}</div>
      </div>
      <div class="entry-media">${mediaHtml(entry.media)}</div>
    </article>`;
}

function mediaHtml(media) {
  if (!media || !(media.src || media.text)) return '';
  const caption = media.caption
    ? `<p class="mat-caption">${escapeHtml(media.caption)}</p>`
    : '';

  if (media.type === 'text') {
    return `
      <div class="mat mat-text">
        ${paragraphs(media.text ?? '')}
        ${caption}
      </div>`;
  }

  if (media.type === 'video') {
    return `
      <figure class="mat" style="margin:0">
        <video src="${attr(media.src)}" controls preload="metadata" playsinline
          ${media.poster ? `poster="${attr(media.poster)}"` : ''}></video>
        ${caption}
      </figure>`;
  }

  return `
    <button class="mat" type="button" data-full="${attr(media.src)}"
            data-caption="${attr(media.caption ?? '')}"
            data-alt="${attr(media.alt ?? media.caption ?? '')}">
      <img src="${attr(media.src)}" alt="${attr(media.alt ?? media.caption ?? '')}" loading="lazy">
      ${caption}
    </button>`;
}

function renderAlbum(data) {
  const photos = (data.album ?? []).filter((p) => p && (p.src || p.thumb));
  if (!photos.length) return;

  $album.hidden = false;

  // An empty heading or note leaves nothing behind.
  const $title = document.getElementById('albumTitle');
  const $note = document.getElementById('albumNote');
  $title.textContent = data.albumTitle ?? 'The photographs';
  $note.textContent = data.albumNote ?? '';
  if (!$title.textContent) $title.remove();
  if (!$note.textContent) $note.remove();

  const $head = $album.querySelector('.album-head');
  if (!$head.children.length) $head.remove();

  $albumStrip.innerHTML = photos.map((photo, i) => `
    <button class="album-tile" type="button" role="listitem" data-index="${i}"
            style="--ratio:${ratio(photo)}">
      <img src="${attr(photo.thumb ?? photo.src)}" alt="${attr(photo.alt ?? '')}"
           loading="lazy" decoding="async">
    </button>`).join('');

  const reelOfAlbum = photos.map((p) => ({
    src: p.src ?? p.thumb,
    caption: p.caption ?? '',
    alt: p.alt ?? '',
  }));

  $albumStrip.querySelectorAll('.album-tile').forEach((tile) => {
    tile.addEventListener('click', () => openViewer(reelOfAlbum, Number(tile.dataset.index)));
  });

  wireAlbumArrows();
}

/** The arrows page the strip along; they grey out at either end. */
function wireAlbumArrows() {
  const $prev = document.getElementById('albumPrev');
  const $next = document.getElementById('albumNext');
  const page = () => Math.max(240, $albumStrip.clientWidth * 0.82);

  $prev.addEventListener('click', () => $albumStrip.scrollBy({ left: -page(), behavior: 'smooth' }));
  $next.addEventListener('click', () => $albumStrip.scrollBy({ left: page(), behavior: 'smooth' }));

  const update = () => {
    const end = $albumStrip.scrollWidth - $albumStrip.clientWidth;
    $prev.disabled = $albumStrip.scrollLeft < 4;
    $next.disabled = $albumStrip.scrollLeft > end - 4;
  };

  $albumStrip.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function ratio(photo) {
  return photo.width && photo.height
    ? (photo.width / photo.height).toFixed(3)
    : '1.4';
}

function renderClosing(data, entries) {
  const count = entries.length;
  document.getElementById('closingLine').textContent =
    data.closing ?? `${count} ${count === 1 ? 'message' : 'messages'}, all for you.`;
}

function openViewer(photos, index) {
  reel = photos;
  showPhoto(index);
  $viewer.showModal();
}

function showPhoto(index) {
  if (!reel.length) return;
  reelIndex = (index + reel.length) % reel.length;

  const photo = reel[reelIndex];
  $viewerImage.src = photo.src;
  $viewerImage.alt = photo.alt || photo.caption || '';
  $viewerCaption.textContent = photo.caption || '';
  $viewerCount.textContent = reel.length > 1 ? `${reelIndex + 1} / ${reel.length}` : '';

  const alone = reel.length < 2;
  $viewerPrev.hidden = alone;
  $viewerNext.hidden = alone;

  // Fetch the neighbours so the next press is instant.
  if (!alone) {
    [reelIndex + 1, reelIndex - 1].forEach((i) => {
      new Image().src = reel[(i + reel.length) % reel.length].src;
    });
  }
}

function slug(entry, i) {
  const base = entry.id ?? entry.name ?? `message-${i + 1}`;
  return String(base)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `message-${i + 1}`;
}

/**
 * A blank line starts a new paragraph; a single newline just breaks the line.
 */
function paragraphs(text) {
  return String(text)
    .split(/\n[ \t]*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/[ \t]*\n[ \t]*/g, '<br>')}</p>`)
    .join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

const attr = escapeHtml;
