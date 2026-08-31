import ReviewFlow from '../src/index.js';
import { createUiRoot } from '../src/uiRoot.js';
import { createCommentPanel } from '../src/commentPanel.js';
import { createCommentPins } from '../src/commentPins.js';
import { groupComments } from '../src/commentGroups.js';
import { runReplyBrowserChecks } from './reply-browser.js';

const pathname = window.location.pathname;
const seed = (id, overrides = {}) => ({
  id, pathname, tagName: 'h1', reviewElementId: 'hero-title', elementId: null,
  elementText: 'Modern weboldal vállalkozásoknak', comment: `Megjegyzés ${id}`,
  elementX: 32, elementY: 100, elementWidth: 600, elementHeight: 90,
  viewportWidth: 1280, viewportHeight: 800, status: 'OPEN',
  createdAt: '2026-08-31T12:00:00Z', ...overrides,
  replies: overrides.replies || [],
});
let savedComments = [
  seed('1', { comment: 'Legyen más a szöveg.', replies: [
    { id: 'developer-reply', commentId: '1', authorType: 'DEVELOPER', authorName: 'Teszt fejlesztő',
      message: 'Mekkora méretet szeretnél?', createdAt: '2026-08-31T13:00:00Z' },
  ] }),
  seed('2', { comment: 'Ez legyen nagyobb.' }),
  seed('3', { comment: '<img src=x onerror=alert(1)>\nEz egyszerű szöveg.', status: 'RESOLVED' }),
  seed('4', { reviewElementId: null, elementId: 'hero-cta', elementText: 'Ajánlatot kérek', tagName: 'button' }),
  seed('5', { reviewElementId: null, elementText: 'Azonosító nélküli elem', tagName: 'p', elementX: 40, elementY: 650, elementWidth: 200, elementHeight: 40 }),
  seed('6', { reviewElementId: null, elementText: 'Azonosító nélküli elem', tagName: 'p', elementX: 40, elementY: 650, elementWidth: 200, elementHeight: 40 }),
  seed('other-page', { pathname: '/other' }),
];

// Only this test page mocks requests; no real review token or backend is used.
const nativeFetch = window.fetch;
let postCount = 0;
let replyCount = 0;
window.fetch = async (input, options = {}) => {
  const url = new URL(input, window.location.origin);
  if (!url.pathname.startsWith('/__reviewflow_test_api/')) {
    return nativeFetch(input, options);
  }
  if (options.method === 'POST' && url.pathname.endsWith('/replies')) {
    ++replyCount;
    if (document.getElementById('fail-save').checked) {
      return Response.json({ message: 'Simulated reply failure' }, { status: 500 });
    }
    const commentId = url.pathname.split('/').at(-2);
    const reply = { id: `client-reply-${replyCount}`, commentId, authorType: 'CLIENT',
      authorName: 'Ügyfél', message: JSON.parse(options.body).message, createdAt: '2026-08-31T14:00:00Z' };
    savedComments = savedComments.map((comment) => comment.id === commentId
      ? { ...comment, replies: [...comment.replies, reply] } : comment);
    return Response.json({ reply }, { status: 201 });
  }
  if (options.method === 'POST') {
    ++postCount;
    if (document.getElementById('fail-save').checked) {
      return Response.json({ message: 'Simulated save failure' }, { status: 500 });
    }
    const payload = JSON.parse(options.body);
    const saved = seed(`saved-${postCount}`, {
      ...payload, elementX: payload.elementRect.x, elementY: payload.elementRect.y,
      elementWidth: payload.elementRect.width, elementHeight: payload.elementRect.height,
    });
    savedComments.push(saved);
    return Response.json({ comment: saved }, { status: 201 });
  }
  if (document.getElementById('fail-load').checked) {
    return Response.json({ message: 'Simulated load failure' }, { status: 500 });
  }
  return Response.json({
    comments: savedComments.filter((comment) => comment.pathname === url.searchParams.get('pathname')),
  });
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const near = (actual, expected) => Math.abs(actual - expected) < 0.1;
const settle = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});
let passed = 0;
let failed = 0;
const test = async (name, run) => {
  const result = document.createElement('li');
  try {
    await run();
    result.textContent = `PASS – ${name}`;
    result.dataset.result = 'pass';
    ++passed;
  } catch (error) {
    result.textContent = `FAIL – ${name}: ${error.message}`;
    result.dataset.result = 'fail';
    ++failed;
  }
  document.getElementById('results').appendChild(result);
};

const ui = createUiRoot();
const panel = createCommentPanel({ root: ui.root, onReply: async () => {} });
const pins = createCommentPins({
  root: ui.root, onSelect: (group, pin) => panel.open(group, pin),
});
let groups = groupComments(savedComments.filter((comment) => comment.pathname === pathname));
pins.render(groups);
await settle();
const firstPin = ui.root.querySelector('[aria-haspopup="dialog"]');

await test('6 komment → 3 pin, a főcímen 3-as számláló', () => {
  assert(ui.root.querySelectorAll('[aria-haspopup="dialog"]').length === 3, 'Pin count');
  assert(firstPin.textContent === '3', 'Group count');
});
await test('A pin a jelenlegi DOM-pozíciót használja', () => {
  const rect = document.querySelector('h1').getBoundingClientRect();
  assert(near(parseFloat(firstPin.style.top), rect.top - 8), 'Anchor position');
});
await test('A panel az összes kommentet és a kétféle státuszt megjeleníti', () => {
  firstPin.click();
  assert(ui.root.querySelectorAll('[data-reviewflow-comment-id]').length === 3, 'Comment count');
  assert(ui.root.querySelector('[role="dialog"]').textContent.includes('RESOLVED'), 'Status');
  assert(firstPin.getAttribute('aria-expanded') === 'true', 'Expanded');
});
await test('A komment HTML-je szöveg marad', () => {
  assert(ui.root.querySelectorAll('img, script').length === 0, 'Unsafe HTML');
  assert(ui.root.querySelector('[role="dialog"]').textContent.includes('<img src=x'), 'Text missing');
});
await test('A céloldal agresszív gombstílusa nem jut át a Shadow DOM-on', () => {
  assert(getComputedStyle(firstPin).backgroundColor === 'rgb(37, 99, 235)', 'Style isolation');
  assert(getComputedStyle(firstPin).fontFamily.includes('Arial'), 'Font isolation');
});
await test('Escape bezárja a panelt és visszaadja a fókuszt a pinnek', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(ui.root.querySelector('[role="dialog"]').style.display === 'none', 'Close');
  assert(ui.root.activeElement === firstPin, 'Focus restore');
});
await test('Újrarendereléskor nincs duplikált pin, a nyitott panel frissül', async () => {
  firstPin.click();
  groups = groupComments([...savedComments.filter((c) => c.pathname === pathname), seed('new')]);
  pins.render(groups);
  panel.update(groups);
  await settle();
  assert(ui.root.querySelector('[aria-haspopup="dialog"]') === firstPin, 'Pin replaced');
  assert(firstPin.textContent === '4', 'Updated count');
  assert(ui.root.querySelectorAll('[data-reviewflow-comment-id]').length === 4, 'Updated panel');
});
await test('Panel-frissítés megőrzi a válaszmező csomópontját, fókuszát és vázlatát', () => {
  const textarea = ui.root.querySelector('textarea');
  textarea.value = 'Félkész válasz';
  textarea.focus();
  panel.update(groups);
  assert(ui.root.querySelector('textarea') === textarea, 'Replaced composer');
  assert(ui.root.activeElement === textarea, 'Lost focus');
  assert(textarea.value === 'Félkész válasz', 'Lost draft');
});
await test('A pin követi a DOM-átrendezést külön görgetés nélkül', async () => {
  document.querySelector('h1').style.marginTop = '80px';
  await settle();
  const rect = document.querySelector('h1').getBoundingClientRect();
  assert(near(parseFloat(firstPin.style.top), rect.top - 8), 'Layout tracking');
  document.querySelector('h1').style.marginTop = '';
  await settle();
});
await test('A pin újra megtalálja a kicserélt DOM-elemet', async () => {
  const heading = document.querySelector('h1');
  heading.replaceWith(heading.cloneNode(true));
  await settle();
  assert(near(parseFloat(firstPin.style.top), document.querySelector('h1').getBoundingClientRect().top - 8), 'Replacement anchor');
});
await test('A pin követi az oldal görgetését', async () => {
  window.scrollTo(0, 60);
  await settle();
  assert(near(parseFloat(firstPin.style.top), document.querySelector('h1').getBoundingClientRect().top - 8), 'Scroll tracking');
  window.scrollTo(0, 0);
  await settle();
});
await test('A csak HTML id-val rendelkező elem is a DOM-hoz rögzül', () => {
  const pin = [...ui.root.querySelectorAll('[aria-haspopup="dialog"]')][1];
  assert(near(parseFloat(pin.style.top), document.getElementById('hero-cta').getBoundingClientRect().top - 8), 'HTML id anchor');
});
await test('Az azonosító nélküli csoport a mentett koordinátán jelenik meg', () => {
  const pin = [...ui.root.querySelectorAll('[aria-haspopup="dialog"]')][2];
  assert(pin.style.left === '232px' && pin.style.top === '642px', 'Coordinate fallback');
});
await test('Üres lista eltávolítja a pineket és bezárja a panelt', () => {
  pins.render([]);
  panel.update([]);
  assert(ui.root.querySelectorAll('[aria-haspopup="dialog"]').length === 0, 'Stale pin');
  assert(ui.root.querySelector('[role="dialog"]').style.display === 'none', 'Stale panel');
});
pins.destroy();
panel.destroy();
ui.destroy();

const apiUrl = `${window.location.origin}/__reviewflow_test_api`;
const initialUrl = new URL(window.location.href);
const noSessionUrl = new URL(initialUrl);
noSessionUrl.searchParams.delete('rf_session');
history.replaceState(null, '', noSessionUrl);
await test('Token nélkül az SDK nem hoz létre saját UI-t', () => {
  assert(ReviewFlow.init({ apiUrl }) === undefined, 'Unexpected session');
  assert(![...document.body.children].some((element) => element.shadowRoot), 'Unexpected UI');
});
initialUrl.searchParams.set('rf_session', 'local-fixture-not-a-real-review-token');
history.replaceState(null, '', initialUrl);
let session = ReviewFlow.init({ apiUrl });
await settle();
await test('Újrainicializáláskor csak egy SDK-példány marad', async () => {
  session = ReviewFlow.init({ apiUrl });
  await settle();
  assert([...document.body.children].filter((element) => element.shadowRoot).length === 1, 'Duplicate root');
});

const sdkRoot = () => [...document.body.children].find((element) => element.shadowRoot)?.shadowRoot;
const selectHeading = () => {
  const heading = document.querySelector('h1');
  const rect = heading.getBoundingClientRect();
  document.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + 10, clientY: rect.top + 10 }));
  heading.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
};
await test('Sikertelen mentéskor a vázlat megmarad, a hiba inline jelenik meg', async () => {
  selectHeading();
  const root = sdkRoot();
  const textarea = root.querySelector('[aria-label="Megjegyzés szövege"]');
  textarea.value = 'Megmaradó vázlat';
  document.getElementById('fail-save').checked = true;
  [...root.querySelectorAll('button')].find((button) => button.textContent === 'Mentés').click();
  await settle();
  assert(textarea.value === 'Megmaradó vázlat', 'Lost draft');
  assert(root.querySelector('[role="alert"]').textContent.includes('nem sikerült'), 'Missing inline error');
  assert(!textarea.disabled, 'Retry is disabled');
});
await test('Újrapróbálás egy kommentet ment és frissíti a meglévő pint', async () => {
  document.getElementById('fail-save').checked = false;
  const root = sdkRoot();
  const button = [...root.querySelectorAll('button')].find((item) => item.textContent === 'Mentés');
  const before = postCount;
  button.click();
  button.click();
  await settle();
  assert(postCount === before + 1, 'Duplicate POST');
  assert(root.querySelector('[aria-haspopup="dialog"]').textContent === '4', 'Saved count');
  assert(root.querySelector('[aria-label="Megjegyzés szövege"]').value === '', 'Composer not cleared');
});
await test('A panelre kattintás nem indít új elemkijelölést', async () => {
  const root = sdkRoot();
  root.querySelector('[aria-haspopup="dialog"]').click();
  root.querySelector('[role="dialog"] h2').click();
  await settle();
  assert(root.querySelector('[aria-label="Megjegyzés szövege"]').parentElement.style.display === 'none', 'Picker captured panel');
  assert(root.querySelector('[role="dialog"]').style.display === 'flex', 'Panel unexpectedly closed');
});
await test('A bezáró gomb eltünteti a panelt', () => {
  const root = sdkRoot();
  root.querySelector('[aria-label="Kommentpanel bezárása"]').click();
  assert(root.querySelector('[role="dialog"]').style.display === 'none', 'Close button');
});
await test('Sikeres POST után hibás újratöltés sem veszíti el a mentett kommentet', async () => {
  selectHeading();
  const root = sdkRoot();
  root.querySelector('[aria-label="Megjegyzés szövege"]').value = 'Sikeres mentés, hibás listaolvasás';
  document.getElementById('fail-load').checked = true;
  [...root.querySelectorAll('button')].find((button) => button.textContent === 'Mentés').click();
  await settle();
  assert(root.querySelector('[aria-haspopup="dialog"]').textContent === '5', 'Lost saved comment');
  assert(root.querySelector('[aria-label="Megjegyzés szövege"]').parentElement.style.display === 'none', 'Unnecessary retry');
  document.getElementById('fail-load').checked = false;
});
await test('Leállítás után eltűnik a UI, új init után visszatölthető', async () => {
  session.destroy();
  assert(!sdkRoot(), 'Leaked root');
  session = ReviewFlow.init({ apiUrl });
  await settle();
  assert(sdkRoot().querySelector('[aria-haspopup="dialog"]').textContent === '5', 'Reloaded count');
});

await runReplyBrowserChecks({
  test, assert, settle, sdkRoot, getReplyCount: () => replyCount,
  reinitialize: () => { session = ReviewFlow.init({ apiUrl }); },
});

// Reset the fixture to the documented 3-comment example for manual interaction.
savedComments = savedComments.filter((comment) => !comment.id.startsWith('saved-'));
savedComments = savedComments.map((comment) => ({
  ...comment, replies: comment.replies.filter((reply) => !reply.id.startsWith('client-reply-')),
}));
session = ReviewFlow.init({ apiUrl });
document.getElementById('summary').textContent = `${passed} sikeres, ${failed} sikertelen teszt.`;
document.getElementById('move-target').addEventListener('click', () => {
  const heading = document.querySelector('h1');
  heading.style.marginTop = heading.style.marginTop ? '' : '100px';
});
document.getElementById('replace-target').addEventListener('click', () => {
  const heading = document.querySelector('h1');
  heading.replaceWith(heading.cloneNode(true));
});
document.getElementById('reinit').addEventListener('click', () => {
  session = ReviewFlow.init({ apiUrl });
});
document.getElementById('destroy').addEventListener('click', () => session.destroy());
