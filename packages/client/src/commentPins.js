import { getCommentGroupTitle } from './commentGroups.js';

const normalizeText = (value) => value?.replace(/\s+/g, ' ').trim().toLocaleLowerCase() || '';

const isVisible = (element) => Boolean(element?.isConnected && element.getClientRects().length);

const findStableElement = (comment) => {
  if (comment.reviewElementId) {
    const element = document.querySelector(
      `[data-review-id="${CSS.escape(comment.reviewElementId)}"]`
    );
    if (element) return element;
  }

  return comment.elementId
    ? document.getElementById(comment.elementId)
    : null;
};

const geometryDistance = (element, comment) => {
  const rect = element.getBoundingClientRect();
  const savedWidth = Number.isFinite(comment.viewportWidth) && comment.viewportWidth > 0
    ? comment.viewportWidth : window.innerWidth;
  const savedHeight = Number.isFinite(comment.viewportHeight) && comment.viewportHeight > 0
    ? comment.viewportHeight : window.innerHeight;
  const savedX = (comment.elementX + comment.elementWidth / 2) / savedWidth;
  const savedY = (comment.elementY + comment.elementHeight / 2) / savedHeight;
  const currentX = (rect.left + rect.width / 2) / Math.max(window.innerWidth, 1);
  const currentY = (rect.top + rect.height / 2) / Math.max(window.innerHeight, 1);
  return Math.hypot(currentX - savedX, currentY - savedY);
};

const findElementByContent = (comment) => {
  const savedText = normalizeText(comment.elementText);
  if (!savedText || typeof comment.tagName !== 'string') return null;

  const candidates = [...document.getElementsByTagName(comment.tagName)]
    .filter((element) => !element.closest?.('[data-reviewflow-ui]') && isVisible(element))
    .map((element) => {
      const candidateText = normalizeText(element.innerText || element.textContent);
      let textRank = Number.POSITIVE_INFINITY;
      if (candidateText === savedText) textRank = 0;
      else if (candidateText.startsWith(savedText) || savedText.startsWith(candidateText)) textRank = 1;
      else if (candidateText.includes(savedText) || savedText.includes(candidateText)) textRank = 2;
      return { element, textRank, distance: geometryDistance(element, comment) };
    })
    .filter(({ textRank }) => Number.isFinite(textRank));

  candidates.sort((left, right) => left.textRank - right.textRank || left.distance - right.distance);
  return candidates[0]?.element || null;
};

export const findTargetElementForComment = (comment) => {
  const stable = findStableElement(comment);
  if (isVisible(stable)) return stable;
  const contentMatch = findElementByContent(comment);
  if (contentMatch) return contentMatch;
  return null;
};

const findElement = (group, currentTarget) => {
  if (isVisible(currentTarget)) return currentTarget;

  for (const comment of [...group.comments].reverse()) {
    const stable = findStableElement(comment);
    if (isVisible(stable)) return stable;
  }
  for (const comment of [...group.comments].reverse()) {
    const contentMatch = findElementByContent(comment);
    if (contentMatch) return contentMatch;
  }
  return null;
};

export const getScaledFallbackPosition = (comment, viewport = window) => {
  const savedWidth = Number.isFinite(comment.viewportWidth) && comment.viewportWidth > 0
    ? comment.viewportWidth : viewport.innerWidth;
  const savedHeight = Number.isFinite(comment.viewportHeight) && comment.viewportHeight > 0
    ? comment.viewportHeight : viewport.innerHeight;
  return {
    x: (comment.elementX + comment.elementWidth) * viewport.innerWidth / savedWidth,
    y: comment.elementY * viewport.innerHeight / savedHeight,
  };
};

export const createCommentPins = ({ root, onSelect }) => {
  const pins = new Map();
  let frame = null;

  const updatePositions = () => {
    frame = null;
    pins.forEach((entry) => {
      const { pin, group } = entry;
      // Re-resolve anchors, including targets mounted/replaced by React.
      const target = findElement(group, entry.target);
      entry.target = target;

      const fallback = group.comments[group.comments.length - 1];
      const rect = target?.getBoundingClientRect();
      const fallbackPosition = rect ? null : getScaledFallbackPosition(fallback);
      const x = rect ? rect.right : fallbackPosition.x;
      const y = rect ? rect.top : fallbackPosition.y;
      const visible = Number.isFinite(x) && Number.isFinite(y) &&
        (!target || (rect.bottom >= 0 && rect.top <= window.innerHeight &&
          rect.right >= 0 && rect.left <= window.innerWidth));

      pin.style.display = visible ? 'flex' : 'none';
      if (visible) {
        const radius = 16;
        pin.style.left = `${Math.min(Math.max(x, radius), window.innerWidth - radius)}px`;
        pin.style.top = `${Math.min(Math.max(y, radius), window.innerHeight - radius)}px`;
        pin.dataset.anchor = target ? 'element' : 'scaled-fallback';
      }
    });
  };

  const schedulePositions = () => {
    if (frame === null && pins.size) {
      frame = window.requestAnimationFrame(updatePositions);
    }
  };

  // Capture catches scrolling inside nested host-page containers as well.
  document.addEventListener('scroll', schedulePositions, true);
  window.addEventListener('resize', schedulePositions);

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(schedulePositions) : null;
  resizeObserver?.observe(document.body);

  const mutationObserver = typeof MutationObserver !== 'undefined'
    ? new MutationObserver((records) => {
      // Shadow UI is isolated; ignore the external picker highlight as well.
      if (records.some(({ target }) => !target.closest?.('[data-reviewflow-ui]'))) {
        schedulePositions();
      }
    }) : null;
  mutationObserver?.observe(document.body, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['id', 'data-review-id', 'class', 'style', 'hidden'],
  });

  const clear = () => {
    pins.forEach(({ pin }) => pin.remove());
    pins.clear();
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
  };

  return {
    render(groups) {
      const keys = new Set(groups.map(({ key }) => key));
      pins.forEach(({ pin }, key) => {
        if (!keys.has(key)) {
          pin.remove();
          pins.delete(key);
        }
      });

      groups.forEach((group) => {
        let entry = pins.get(group.key);
        if (!entry) {
          const pin = document.createElement('button');
          pin.type = 'button';
          pin.setAttribute('data-reviewflow-ui', 'true');
          pin.setAttribute('aria-haspopup', 'dialog');
          pin.setAttribute('aria-controls', 'reviewflow-comment-panel');
          pin.setAttribute('aria-expanded', 'false');
          Object.assign(pin.style, {
            position: 'fixed', minWidth: '32px', height: '32px',
            padding: '0 7px', borderRadius: '999px', transform: 'translate(-50%, -50%)',
            border: '2px solid white', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#ffffff',
            fontFamily: 'Arial, sans-serif', fontSize: '12px',
            fontWeight: '700', lineHeight: '1', cursor: 'pointer',
            zIndex: '1', display: 'none', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 3px 12px rgba(37, 99, 235, .38)',
            transition: 'filter .15s ease, box-shadow .15s ease',
          });
          pin.className = 'rf-comment-pin';
          entry = { pin, group, target: null };
          pin.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelect?.(entry.group, pin);
          });
          root.appendChild(pin);
          pins.set(group.key, entry);
        }

        entry.group = group;
        if (!entry.target?.isConnected) entry.target = null;
        entry.pin.textContent = String(group.comments.length);
        const label = `${getCommentGroupTitle(group)}: ${group.comments.length} megjegyzés`;
        entry.pin.title = label;
        entry.pin.setAttribute('aria-label', label);
      });
      schedulePositions();
    },
    pulse(key) {
      const entry = pins.get(key);
      if (entry?.pin) {
        entry.pin.classList.remove('rf-pulse-pin');
        void entry.pin.offsetWidth;
        entry.pin.classList.add('rf-pulse-pin');
        setTimeout(() => {
          entry.pin.classList.remove('rf-pulse-pin');
        }, 3500);
      }
    },
    getPin(key) {
      return pins.get(key)?.pin || null;
    },
    clear,
    destroy() {
      clear();
      document.removeEventListener('scroll', schedulePositions, true);
      window.removeEventListener('resize', schedulePositions);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    },
  };
};
