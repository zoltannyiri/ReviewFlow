export const createUiRoot = () => {
  const host = document.createElement('div');
  host.setAttribute('data-reviewflow-ui', 'true');

  // Inline important rules protect the host itself from customer CSS.
  const hostStyles = {
    all: 'initial',
    position: 'fixed',
    inset: '0',
    display: 'block',
    'z-index': '2147483647',
    'pointer-events': 'none',
  };

  Object.entries(hostStyles).forEach(([name, value]) => {
    host.style.setProperty(name, value, 'important');
  });

  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { font-family: Arial, sans-serif; color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    button, textarea { font: inherit; }
    button { touch-action: manipulation; }
    button:disabled { cursor: wait; opacity: .65; }
    button:focus-visible, textarea:focus-visible {
      outline: 3px solid #93c5fd;
      outline-offset: 3px;
    }
    [data-reviewflow-ui] { pointer-events: auto; }
    .rf-thread { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #cbd5e1; }
    .rf-thread h3 { margin: 0 0 10px; font-size: 12px; color: #475569; }
    .rf-thread ol { list-style: none; margin: 0; padding: 0; }
    .rf-thread li { margin: 8px 0; padding: 10px; background: #f8fafc; border-left: 3px solid #cbd5e1; border-radius: 5px; }
    .rf-thread li.rf-developer-reply { border-left-color: #2563eb; }
    .rf-thread li div { display: flex; flex-wrap: wrap; gap: 4px 8px; color: #64748b; font-size: 11px; }
    .rf-thread strong { color: #334155; overflow-wrap: anywhere; }
    .rf-thread p { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .rf-thread label { display: block; font-size: 12px; color: #475569; margin-top: 12px; }
    .rf-thread textarea { display: block; width: 100%; min-height: 72px; padding: 9px; margin-top: 6px; resize: vertical; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #111827; font-size: 13px; }
    .rf-thread button { margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #1d4ed8; padding: 7px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .rf-thread-error { color: #b91c1c; font-size: 12px; }
    .rf-thread [role="status"] { color: #166534; font-size: 12px; }
  `;
  root.appendChild(style);
  document.body.appendChild(host);

  return {
    root,
    destroy() {
      host.remove();
    },
  };
};
