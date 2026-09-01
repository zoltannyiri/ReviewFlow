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
    .rf-comment-pin:hover { filter: brightness(1.08); box-shadow: 0 5px 16px rgba(37, 99, 235, .48) !important; }
    
    @keyframes rf-pin-pulse {
      0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.8); }
      50% { transform: translate(-50%, -50%) scale(1.3); box-shadow: 0 0 0 16px rgba(37, 99, 235, 0); }
      100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
    }
    .rf-pulse-pin {
      animation: rf-pin-pulse 1s ease 3 !important;
    }

    @keyframes rf-focus-pulse {
      0% { box-shadow: 0 0 0 2px #2563eb, 0 0 12px rgba(37, 99, 235, 0.4); opacity: 0.85; }
      100% { box-shadow: 0 0 0 5px #1d4ed8, 0 0 32px rgba(37, 99, 235, 0.95); opacity: 1; }
    }
    .rf-focus-highlight {
      position: fixed;
      pointer-events: none;
      z-index: 2147483645;
      border: 3px solid #2563eb;
      border-radius: 6px;
      animation: rf-focus-pulse 0.8s ease-in-out infinite alternate;
      background: rgba(37, 99, 235, 0.08);
      transition: opacity 0.4s ease;
    }

    .rf-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(0);
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 20px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      border: 1px solid #334155;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 1;
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: auto;
    }
    .rf-toast.rf-toast-hiding {
      opacity: 0;
      transform: translateX(-50%) translateY(10px);
    }

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

  let toastTimeout = null;
  let activeToast = null;

  const showToast = (message, duration = 3000) => {
    if (activeToast) {
      clearTimeout(toastTimeout);
      activeToast.remove();
      activeToast = null;
    }
    const toast = document.createElement('div');
    toast.className = 'rf-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('data-reviewflow-ui', 'true');
    toast.textContent = `✓ ${message}`;
    root.appendChild(toast);
    activeToast = toast;

    toastTimeout = setTimeout(() => {
      toast.classList.add('rf-toast-hiding');
      setTimeout(() => {
        if (activeToast === toast) activeToast = null;
        toast.remove();
      }, 300);
    }, duration);
  };

  return {
    root,
    showToast,
    destroy() {
      clearTimeout(toastTimeout);
      host.remove();
    },
  };
};
