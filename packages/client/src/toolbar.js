export const REVIEW_MODES = Object.freeze({ BROWSING: 'BROWSING', COMMENTING: 'COMMENTING' });

const VIEWPORT_MARGIN = 8;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

export const createReviewToolbar = ({ root, initialMode = REVIEW_MODES.BROWSING, onModeChange }) => {
  const toolbar = document.createElement('div');
  toolbar.setAttribute('data-reviewflow-ui', 'true');
  Object.assign(toolbar.style, {
    position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '3', background: '#111827', color: '#ffffff', padding: '8px 10px',
    borderRadius: '12px', maxWidth: 'calc(100% - 24px)', fontFamily: 'Arial, sans-serif',
    fontSize: '13px', boxShadow: '0 4px 20px rgba(0,0,0,.25)', display: 'flex',
    alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: '8px',
  });
  const dragHandle = document.createElement('button');
  dragHandle.type = 'button';
  dragHandle.textContent = '⠿';
  dragHandle.setAttribute('aria-label', 'ReviewFlow eszköztár mozgatása');
  dragHandle.title = 'Húzd az eszköztár mozgatásához';
  Object.assign(dragHandle.style, {
    border: '0', borderRadius: '6px', padding: '4px 2px', background: 'transparent',
    color: '#94a3b8', cursor: 'grab', fontSize: '17px', lineHeight: '1',
    touchAction: 'none', userSelect: 'none', flex: '0 0 auto',
  });
  const label = document.createElement('strong');
  label.setAttribute('role', 'status');
  const browsing = document.createElement('button');
  browsing.type = 'button';
  browsing.textContent = 'Böngészés';
  const commenting = document.createElement('button');
  commenting.type = 'button';
  commenting.textContent = 'Kommentelés';
  for (const button of [browsing, commenting]) {
    Object.assign(button.style, {
      border: '1px solid #64748b', borderRadius: '8px', padding: '6px 9px',
      color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
    });
  }
  toolbar.append(dragHandle, label, browsing, commenting);
  root.appendChild(toolbar);
  let mode = initialMode;
  let status = '';
  let drag = null;
  let hasCustomPosition = false;

  const placeWithinViewport = (left, top) => {
    const rect = toolbar.getBoundingClientRect();
    const maximumLeft = window.innerWidth - rect.width - VIEWPORT_MARGIN;
    const maximumTop = window.innerHeight - rect.height - VIEWPORT_MARGIN;
    toolbar.style.transform = 'none';
    toolbar.style.left = `${clamp(left, VIEWPORT_MARGIN, maximumLeft)}px`;
    toolbar.style.top = `${clamp(top, VIEWPORT_MARGIN, maximumTop)}px`;
    hasCustomPosition = true;
  };

  const keepWithinViewport = () => {
    if (!hasCustomPosition) return;
    const rect = toolbar.getBoundingClientRect();
    placeWithinViewport(rect.left, rect.top);
  };

  const resetPosition = () => {
    hasCustomPosition = false;
    toolbar.style.left = '50%';
    toolbar.style.top = '16px';
    toolbar.style.transform = 'translateX(-50%)';
  };

  const render = () => {
    const modeLabel = mode === REVIEW_MODES.COMMENTING ? 'Kommentelés' : 'Böngészés';
    label.textContent = status || `💬 ReviewFlow – ${modeLabel}`;
    browsing.setAttribute('aria-pressed', String(mode === REVIEW_MODES.BROWSING));
    commenting.setAttribute('aria-pressed', String(mode === REVIEW_MODES.COMMENTING));
    browsing.style.background = mode === REVIEW_MODES.BROWSING ? '#2563eb' : '#1f2937';
    commenting.style.background = mode === REVIEW_MODES.COMMENTING ? '#2563eb' : '#1f2937';
    window.requestAnimationFrame(keepWithinViewport);
  };
  const setMode = (nextMode) => {
    if (!Object.values(REVIEW_MODES).includes(nextMode) || nextMode === mode) return;
    mode = nextMode;
    status = '';
    render();
    onModeChange?.(mode);
  };
  const browse = () => setMode(REVIEW_MODES.BROWSING);
  const comment = () => setMode(REVIEW_MODES.COMMENTING);
  const startDrag = (event) => {
    if (event.button !== 0) return;
    const rect = toolbar.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    placeWithinViewport(rect.left, rect.top);
    dragHandle.style.cursor = 'grabbing';
    event.preventDefault();
  };
  const moveDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    placeWithinViewport(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
    event.preventDefault();
  };
  const stopDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    dragHandle.style.cursor = 'grab';
  };
  const moveWithKeyboard = (event) => {
    if (event.key === 'Home') {
      resetPosition();
      event.preventDefault();
      return;
    }
    const directions = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction) return;
    const rect = toolbar.getBoundingClientRect();
    const distance = event.shiftKey ? 40 : 12;
    placeWithinViewport(rect.left + direction[0] * distance, rect.top + direction[1] * distance);
    event.preventDefault();
  };
  browsing.addEventListener('click', browse);
  commenting.addEventListener('click', comment);
  dragHandle.addEventListener('pointerdown', startDrag);
  dragHandle.addEventListener('keydown', moveWithKeyboard);
  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  window.addEventListener('resize', keepWithinViewport);
  render();

  return {
    getMode: () => mode,
    setMode,
    setStatus(message = '') { status = message; render(); },
    destroy() {
      browsing.removeEventListener('click', browse);
      commenting.removeEventListener('click', comment);
      dragHandle.removeEventListener('pointerdown', startDrag);
      dragHandle.removeEventListener('keydown', moveWithKeyboard);
      window.removeEventListener('pointermove', moveDrag);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
      window.removeEventListener('resize', keepWithinViewport);
      toolbar.remove();
    },
  };
};
