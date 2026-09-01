const REVIEWFLOW_ATTRIBUTE = 'data-reviewflow-ui';

export const createCommentBox = ({
  root,
  onSubmit,
}) => {
  const selectionHighlight = document.createElement('div');
  selectionHighlight.setAttribute(REVIEWFLOW_ATTRIBUTE, 'true');
  Object.assign(selectionHighlight.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483645',
    border: '2px solid #2563eb',
    background: 'rgba(37, 99, 235, 0.15)',
    display: 'none',
    borderRadius: '4px',
    boxShadow: '0 0 12px rgba(37, 99, 235, 0.45)',
    transition: 'all 0.15s ease',
  });
  root.appendChild(selectionHighlight);

  const container = document.createElement('div');
  container.setAttribute(REVIEWFLOW_ATTRIBUTE, 'true');

  Object.assign(container.style, {
    position: 'fixed',
    zIndex: '2147483647',
    width: '320px',
    maxWidth: 'calc(100% - 24px)',
    maxHeight: 'calc(100dvh - 24px)',
    overflowY: 'auto',
    display: 'none',
    background: '#111827',
    color: '#ffffff',
    padding: '14px',
    borderRadius: '12px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
    fontFamily: 'Arial, sans-serif',
  });

  const title = document.createElement('div');
  title.innerText = 'Megjegyzés hozzáadása';

  Object.assign(title.style, {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#f9fafb',
  });

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Írd le, min változtatnál...';
  textarea.setAttribute('aria-label', 'Megjegyzés szövege');

  Object.assign(textarea.style, {
    width: '100%',
    minHeight: '100px',
    resize: 'vertical',
    boxSizing: 'border-box',
    borderRadius: '8px',
    border: '1px solid #374151',
    background: '#1f2937',
    color: '#ffffff',
    padding: '10px',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
  });

  const actions = document.createElement('div');

  const errorMessage = document.createElement('div');
  errorMessage.setAttribute('role', 'alert');
  Object.assign(errorMessage.style, {
    color: '#fca5a5',
    fontSize: '13px',
    marginTop: '8px',
    lineHeight: '1.4',
  });

  Object.assign(actions.style, {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '10px',
  });

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.innerText = 'Mégse';

  Object.assign(cancelButton.style, {
    border: 'none',
    background: 'transparent',
    color: '#d1d5db',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    fontWeight: '500',
  });

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.innerText = 'Mentés';

  Object.assign(saveButton.style, {
    border: 'none',
    background: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '8px 14px',
    borderRadius: '7px',
    fontWeight: '600',
  });

  actions.appendChild(cancelButton);
  actions.appendChild(saveButton);

  container.appendChild(title);
  container.appendChild(textarea);
  container.appendChild(errorMessage);
  container.appendChild(actions);

  root.appendChild(container);

  let selectedElement = null;
  let submitting = false;
  let destroyed = false;
  let focusTimer = null;

  const close = () => {
    if (submitting) return;
    container.style.display = 'none';
    selectionHighlight.style.display = 'none';
    textarea.value = '';
    errorMessage.textContent = '';
    selectedElement = null;
    clearTimeout(focusTimer);
  };

  const open = (selection) => {
    if (submitting) return;
    selectedElement = selection;
    textarea.value = '';
    errorMessage.textContent = '';

    // Position target element highlight
    selectionHighlight.style.display = 'block';
    selectionHighlight.style.left = `${selection.elementRect.x}px`;
    selectionHighlight.style.top = `${selection.elementRect.y}px`;
    selectionHighlight.style.width = `${selection.elementRect.width}px`;
    selectionHighlight.style.height = `${selection.elementRect.height}px`;

    const popupWidth = 320;
    const margin = 12;

    let left = selection.elementRect.x + selection.elementRect.width + margin;
    let top = selection.elementRect.y;

    if (left + popupWidth > window.innerWidth - margin) {
      left = selection.elementRect.x - popupWidth - margin;
    }

    if (left < margin) {
      left = margin;
    }

    if (top < margin) {
      top = margin;
    }

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
    container.style.display = 'block';

    top = Math.max(margin, Math.min(
      top, window.innerHeight - container.getBoundingClientRect().height - margin
    ));
    container.style.top = `${top}px`;

    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  cancelButton.addEventListener('click', close);

  saveButton.addEventListener('click', async () => {
    const comment = textarea.value.trim();

    if (!comment || !selectedElement || submitting) {
      return;
    }

    submitting = true;
    saveButton.disabled = true;
    cancelButton.disabled = true;
    textarea.disabled = true;
    saveButton.textContent = 'Mentés…';
    errorMessage.textContent = '';

    let saved = false;
    try {
      await onSubmit({ element: selectedElement, comment });
      saved = true;
    } catch {
      if (!destroyed) {
        errorMessage.textContent = 'A megjegyzést nem sikerült menteni. Próbáld újra.';
      }
    } finally {
      submitting = false;
      saveButton.disabled = false;
      cancelButton.disabled = false;
      textarea.disabled = false;
      saveButton.textContent = 'Mentés';
      if (!destroyed && saved) {
        close();
      } else if (!destroyed) {
        textarea.focus();
      }
    }
  });

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && !submitting) close();
  };
  document.addEventListener('keydown', handleKeyDown);

  return {
    open,
    close,
    destroy() {
      destroyed = true;
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      selectionHighlight.remove();
      container.remove();
    },
  };
};
