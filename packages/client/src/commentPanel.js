import { getCommentGroupTitle } from './commentGroups.js';
import { createCommentThread } from './commentThread.js';

export const createCommentPanel = ({ root, onReply }) => {
  const panel = document.createElement('section');
  panel.setAttribute('data-reviewflow-ui', 'true');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'reviewflow-panel-title');
  panel.id = 'reviewflow-comment-panel';

  Object.assign(panel.style, {
    position: 'fixed', top: '16px', right: '16px',
    width: '380px', maxWidth: 'calc(100% - 32px)',
    maxHeight: 'calc(100dvh - 32px)', display: 'none',
    flexDirection: 'column', background: '#ffffff', color: '#111827',
    border: '1px solid #dbe3ef', borderRadius: '16px',
    boxShadow: '0 16px 48px rgba(15, 23, 42, .25)',
    fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.5',
    overflow: 'hidden', zIndex: '2',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    padding: '20px', borderBottom: '1px solid #e5e7eb',
    overflowY: 'auto', flexShrink: '0', maxHeight: '40vh',
  });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Kommentpanel bezárása');
  Object.assign(closeButton.style, {
    float: 'right', marginLeft: '12px', width: '32px', height: '32px',
    border: '0', borderRadius: '8px', background: '#f1f5f9',
    color: '#334155', cursor: 'pointer', fontSize: '22px',
  });

  const label = document.createElement('div');
  label.textContent = 'ReviewFlow · Megjegyzések';
  Object.assign(label.style, {
    color: '#2563eb', fontSize: '12px', fontWeight: '700',
  });

  const title = document.createElement('h2');
  title.id = 'reviewflow-panel-title';
  Object.assign(title.style, {
    margin: '10px 0 6px', fontSize: '18px',
    lineHeight: '1.4', overflowWrap: 'anywhere',
  });

  const metaRow = document.createElement('div');
  Object.assign(metaRow.style, {
    display: 'flex', gap: '10px', alignItems: 'center', color: '#64748b', fontSize: '12px',
  });

  const count = document.createElement('span');
  const pageBadge = document.createElement('code');
  Object.assign(pageBadge.style, {
    background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569',
  });

  metaRow.append(count, pageBadge);

  const notice = document.createElement('div');
  Object.assign(notice.style, {
    display: 'none', marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
    background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
    fontSize: '12px', lineHeight: '1.4', fontWeight: '500',
  });

  const list = document.createElement('ol');
  Object.assign(list.style, {
    listStyle: 'none', margin: '0', padding: '0 20px',
    overflowY: 'auto', overscrollBehavior: 'contain', minHeight: '0',
  });

  header.append(closeButton, label, title, metaRow, notice);
  panel.append(header, list);
  root.appendChild(panel);

  let activeKey = null;
  let trigger = null;

  const close = ({ restoreFocus = true } = {}) => {
    panel.style.display = 'none';
    notice.style.display = 'none';
    notice.textContent = '';
    activeKey = null;
    trigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus && trigger?.isConnected) {
      trigger.focus({ preventScroll: true });
    }
    trigger = null;
  };

  const cards = new Map();

  const createCard = (comment) => {
    const item = document.createElement('li');
    item.setAttribute('data-reviewflow-comment-id', comment.id);
    Object.assign(item.style, {
      padding: '18px 0', borderBottom: '1px solid #e5e7eb',
      transition: 'background-color 0.3s ease, padding 0.3s ease',
    });
    const meta = document.createElement('div');
    Object.assign(meta.style, {
      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
    });
    const number = document.createElement('span');
    number.style.color = '#64748b';
    const status = document.createElement('span');
    Object.assign(status.style, {
      padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
    });
    meta.append(number, status);
    const createdAt = new Date(comment.createdAt);
    if (comment.createdAt && Number.isFinite(createdAt.getTime())) {
      const time = document.createElement('time');
      time.dateTime = createdAt.toISOString();
      time.textContent = createdAt.toLocaleString('hu-HU', {
        dateStyle: 'short', timeStyle: 'short',
      });
      Object.assign(time.style, { color: '#64748b', fontSize: '12px' });
      meta.appendChild(time);
    }
    const message = document.createElement('p');
    Object.assign(message.style, {
      margin: '10px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
    });
    const thread = createCommentThread({ onReply });
    item.append(meta, message, thread.element);
    return { item, number, status, message, thread };
  };

  const render = (group, focusCommentId = null) => {
    title.textContent = getCommentGroupTitle(group);
    count.textContent = `${group.comments.length} megjegyzés`;
    pageBadge.textContent = group.comments[0]?.pathname || window.location.pathname;

    const visible = new Set(group.comments.map(({ id }) => id));
    [...list.children].forEach((item) => {
      if (!visible.has(item.getAttribute('data-reviewflow-comment-id'))) item.remove();
    });

    group.comments.forEach((comment, index) => {
      let card = cards.get(comment.id);
      if (!card) {
        card = createCard(comment);
        cards.set(comment.id, card);
      }
      card.number.textContent = `#${index + 1}`;
      card.item.setAttribute('aria-label', `Megjegyzés #${index + 1}`);
      card.status.textContent = comment.status || 'OPEN';
      const resolved = comment.status === 'RESOLVED';
      card.status.style.color = resolved ? '#166534' : '#1d4ed8';
      card.status.style.background = resolved ? '#dcfce7' : '#dbeafe';
      card.message.textContent = comment.comment;
      card.thread.update(comment);

      // Highlight card if focused
      if (focusCommentId && comment.id === focusCommentId) {
        card.item.style.backgroundColor = '#eff6ff';
        card.item.style.borderRadius = '8px';
        card.item.style.padding = '18px 10px';
        setTimeout(() => {
          card.item.style.backgroundColor = 'transparent';
          card.item.style.padding = '18px 0';
        }, 3500);
      }

      // Keep existing form nodes, focus and drafts when the comment list refreshes.
      if (list.children[index] !== card.item) {
        list.insertBefore(card.item, list.children[index] || null);
      }
    });

    if (focusCommentId) {
      const targetCard = cards.get(focusCommentId);
      if (targetCard) {
        setTimeout(() => {
          targetCard.item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && activeKey !== null) {
      event.preventDefault();
      close();
    }
  };
  closeButton.addEventListener('click', () => close());
  document.addEventListener('keydown', handleKeyDown);

  return {
    open(group, pin, { noticeText = '', focusCommentId = null } = {}) {
      trigger?.setAttribute('aria-expanded', 'false');
      trigger = pin;
      activeKey = group.key;

      if (noticeText) {
        notice.textContent = noticeText;
        notice.style.display = 'block';
      } else {
        notice.textContent = '';
        notice.style.display = 'none';
      }

      render(group, focusCommentId);
      list.scrollTop = 0;
      panel.style.display = 'flex';
      trigger?.setAttribute('aria-expanded', 'true');
      closeButton.focus({ preventScroll: true });
    },
    update(groups) {
      const existing = new Set(groups.flatMap((group) => group.comments.map(({ id }) => id)));
      cards.forEach((card, id) => {
        if (!existing.has(id)) {
          card.thread.destroy();
          card.item.remove();
          cards.delete(id);
        }
      });
      if (activeKey === null) return;
      const group = groups.find(({ key }) => key === activeKey);
      if (group) render(group);
      else close();
    },
    close,
    destroy() {
      close({ restoreFocus: false });
      cards.forEach((card) => card.thread.destroy());
      cards.clear();
      document.removeEventListener('keydown', handleKeyDown);
      panel.remove();
    },
  };
};
