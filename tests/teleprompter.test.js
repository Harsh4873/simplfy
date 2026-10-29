import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, expect, test } from 'vitest';

const html = readFileSync('public/tele/index.html', 'utf8');
let dom;
function open(hash = '', savedView) {
  dom = new JSDOM(html, {
    url: `https://example.test/simplfy/tele/${hash}`,
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollIntoView = () => {};
      if (savedView) w.localStorage.setItem('tele-reading-view', savedView);
    },
  });
  return dom.window.document;
}
const shown = d => [...d.querySelectorAll('main > section')].filter(s => !s.hidden).map(s => s.id);
function swipe(d, dx, dy) {
  const target = d.getElementById('script');
  for (const [type, touches, changedTouches] of [
    ['touchstart', [{clientX: 200, clientY: 200}], []],
    ['touchend', [], [{clientX: 200 + dx, clientY: 200 + dy}]],
  ]) {
    const e = new dom.window.Event(type, {bubbles: true});
    Object.defineProperties(e, {touches: {value: touches}, changedTouches: {value: changedTouches}});
    target.dispatchEvent(e);
  }
}
afterEach(() => dom?.window.close());

test('cards skip hidden slides and stop at both ends', () => {
  const d = open();
  expect(shown(d)).toEqual(['slide-1']);
  expect(d.getElementById('previousCard').disabled).toBe(true);
  for (let i = 0; i < 3; i++) d.getElementById('nextCard').click();
  expect(shown(d)).toEqual(['slide-9']);
  for (let i = 0; i < 20; i++) d.getElementById('nextCard').click();
  expect(shown(d)).toEqual(['references']);
  expect(d.getElementById('nextCard').disabled).toBe(true);
  d.getElementById('resetScroll').click();
  expect(shown(d)).toEqual(['slide-1']);
  for (let i = 4; i <= 8; i++) expect(d.getElementById(`slide-${i}`)).toBeNull();
});

test('scroll view shows all active slides and remembers the mode', () => {
  const d = open('#slide-14');
  expect(shown(d)).toEqual(['slide-14']);
  d.getElementById('scrollView').click();
  expect(shown(d)).toHaveLength(13);
  expect(d.getElementById('cardControls').hidden).toBe(true);
  expect(d.getElementById('autoScroll').disabled).toBe(false);
  expect(dom.window.localStorage.getItem('tele-reading-view')).toBe('scroll');
  for (const card of d.querySelectorAll('main > section')) {
    const atOrAfter = ['slide-14', 'slide-15', 'slide-16', 'slide-17', 'references'].includes(card.id);
    card.getBoundingClientRect = () => ({bottom: atOrAfter ? 500 : -20});
  }
  d.getElementById('cardView').click();
  expect(shown(d)).toEqual(['slide-14']);
  expect(d.getElementById('autoScroll').disabled).toBe(true);
});

test('horizontal swipes navigate while vertical scrolling and slider keys do not', () => {
  const d = open('#slide-3');
  swipe(d, -100, 10);
  expect(shown(d)).toEqual(['slide-9']);
  swipe(d, 20, -150);
  expect(shown(d)).toEqual(['slide-9']);
  swipe(d, 100, 5);
  expect(shown(d)).toEqual(['slide-3']);
  d.getElementById('nextCard').dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
  expect(shown(d)).toEqual(['slide-9']);
  d.getElementById('fontSizeSlider').dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
  expect(shown(d)).toEqual(['slide-9']);
});

test('jump links choose cards and saved scroll mode restores continuous reading', () => {
  const d = open();
  d.querySelector('a[href="#slide-17"]').click();
  expect(shown(d)).toEqual(['slide-17']);
  expect(dom.window.location.hash).toBe('#slide-17');
  expect(d.querySelector('[aria-current="step"]').hash).toBe('#slide-17');
  expect(d.getElementById('cardStatus').textContent).toContain('Slide 17');
  dom.window.close();
  const restored = open('', 'scroll');
  expect(shown(restored)).toHaveLength(13);
  expect(restored.getElementById('scrollView').getAttribute('aria-pressed')).toBe('true');
});
