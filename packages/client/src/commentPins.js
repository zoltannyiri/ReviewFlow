import { getCommentGroupTitle } from './commentGroups.js';

const findElement = (comment) => {
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

export const createCommentPins = ({ root, onSelect }) => {
  const pins = new Map();
  let frame = null;

  const updatePositions = () => {
    frame = null;
    pins.forEach(({ pin, group }) => {
      // Re-resolve anchors, including targets mounted/replaced by React.
      let target = null;
      for (const comment of group.comments) {
        target = findElement(comment);
        if (target) break;
      }

      const fallback = group.comments[group.comments.length - 1];
      const rect = target?.getBoundingClientRect();
      const x = rect ? rect.right - 8
        : fallback.elementX + fallback.elementWidth - 8;
      const y = rect ? rect.top - 8 : fallback.elementY - 8;
      const visible = Number.isFinite(x) && Number.isFinite(y) &&
        (!target || target.getClientRects().length > 0);

      pin.style.display = visible ? 'flex' : 'none';
      if (visible) {
        pin.style.left = `${x}px`;
        pin.style.top = `${y}px`;
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
            position: 'fixed', minWidth: '28px', height: '28px',
            padding: '0 6px', borderRadius: '999px',
            border: '2px solid white', background: '#2563eb', color: '#ffffff',
            fontFamily: 'Arial, sans-serif', fontSize: '12px',
            fontWeight: '700', lineHeight: '1', cursor: 'pointer',
            zIndex: '1', display: 'none', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 2px 8px rgba(0, 0, 0, .25)',
          });
          entry = { pin, group };
          pin.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelect?.(entry.group, pin);
          });
          root.appendChild(pin);
          pins.set(group.key, entry);
        }

        entry.group = group;
        entry.pin.textContent = String(group.comments.length);
        const label = `${getCommentGroupTitle(group)}: ${group.comments.length} megjegyzés`;
        entry.pin.title = label;
        entry.pin.setAttribute('aria-label', label);
      });
      schedulePositions();
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
