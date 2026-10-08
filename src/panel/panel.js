// The in-page panel: window 1 and window 2 side by side on one track. Drag/swipe left (or two-finger
// scroll, arrow keys, the "Prodavač" button) to slide from window 1 to window 2. Lives in a closed
// Shadow DOM so host-page styles can't leak in.
import { PANEL_CSS } from './panel-css.js';
import { renderListing } from '../window1-listing/view.js';
import { renderSeller, renderSellerLoading } from '../window2-seller/view.js';


/**
 * @param {object} opts
 * @param {object} opts.listing         result of the window-1 scraper
 * @param {object} opts.listingInsights platform data for window 1
 * @param {() => Promise<{profile, insights}>} opts.loadSeller  lazy loader for window 2
 */
export function mountPanel({ listing, listingInsights, loadSeller }) {
  document.getElementById('shaker-root')?.remove();
  const host = document.createElement('div');
  host.id = 'shaker-root';
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483646; top: 16px; right: 16px;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>${PANEL_CSS}</style>
    <div class="panel" tabindex="-1">
      <div class="viewport"><div class="track">${renderListing(listing, listingInsights)}${renderSellerLoading()}</div></div>
      <div class="dots" aria-hidden="true"><span class="dot on"></span><span class="dot"></span></div>
    </div>`;
  document.documentElement.appendChild(host);

  // Events from the shadow DOM bubble to the page; without this, dragging the panel also drags
  // whatever carousel/gallery the host page has listening on document.
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'click', 'wheel', 'keydown']) {
    host.addEventListener(type, (e) => e.stopPropagation());
  }

  const panel = root.querySelector('.panel');
  const track = root.querySelector('.track');
  const viewport = root.querySelector('.viewport');
  const dots = root.querySelectorAll('.dot');
  let index = 0;
  let sellerRequested = false;

  const setX = (px, animate) => {
    track.style.transition = animate ? 'transform 280ms cubic-bezier(.2,.8,.2,1)' : 'none';
    track.style.transform = `translateX(calc(${-index * 100}% + ${px}px))`;
  };

  const go = (i) => {
    index = Math.max(0, Math.min(1, i));
    setX(0, true);
    dots.forEach((d, n) => d.classList.toggle('on', n === index));
    if (index === 1 && !sellerRequested) {
      sellerRequested = true;
      loadSeller()
        .then(({ profile, insights }) => {
          track.children[1].outerHTML = renderSeller(profile, insights);
        })
        .catch(() => {
          track.children[1].innerHTML = '<div class="loading">Ne mogu učitati prodavača.</div>';
        });
    }
  };

  // Buttons (delegated, so window 2 works after it re-renders)
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go], [data-close]');
    if (!t) return;
    if (t.hasAttribute('data-close')) host.remove();
    else go(+t.dataset.go);
  });

  // Drag / swipe: pull left to reach window 2, right to go back. Only claims the pointer once the
  // gesture is clearly horizontal, so taps on buttons and vertical scrolling still work.
  let startX = null, startY = 0, dx = 0, dragging = false;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('input, textarea')) return;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dragging = false;
  });
  viewport.addEventListener('pointermove', (e) => {
    if (startX == null) return;
    if (e.buttons === 0) {
      // Button released outside the panel without capture: forget the gesture.
      startX = null;
      dragging = false;
      return;
    }
    dx = e.clientX - startX;
    if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - startY)) {
      dragging = true;
      viewport.setPointerCapture(e.pointerId);
    }
    if (dragging) {
      const edge = (index === 0 && dx > 0) || (index === 1 && dx < 0); // rubber-band at the ends
      setX(edge ? dx / 4 : dx, false);
    }
  });
  const end = () => {
    if (startX == null) return;
    if (dragging) {
      if (dx < -60) go(index + 1);
      else if (dx > 60) go(index - 1);
      else setX(0, true);
    }
    startX = null;
    dragging = false;
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);
  // A drag that ends on a link shouldn't follow it.
  viewport.addEventListener('click', (e) => { if (Math.abs(dx) > 8) { e.preventDefault(); e.stopPropagation(); dx = 0; } }, true);

  // Two-finger trackpad swipe
  let wheelAcc = 0, wheelLock = false;
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (wheelLock) return;
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) > 50) {
        go(index + (wheelAcc > 0 ? 1 : -1));
        wheelAcc = 0;
        wheelLock = true;
        setTimeout(() => (wheelLock = false), 450);
      }
    },
    { passive: false }
  );

  panel.addEventListener('keydown', (e) => {
    if (e.target.closest('input')) return;
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'Escape') host.remove();
  });

  return { go, destroy: () => host.remove() };
}
