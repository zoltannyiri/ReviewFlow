export const createCommentThread = ({ onReply }) => {
  const element = document.createElement('section');
  element.setAttribute('data-reviewflow-ui', 'true');
  element.className = 'rf-thread';
  element.setAttribute('aria-label', 'Beszélgetés');
  const heading = document.createElement('h3');
  const replies = document.createElement('ol');
  const form = document.createElement('form');
  const label = document.createElement('label');
  label.textContent = 'Válasz szövege';
  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Írd le a választ…';
  textarea.maxLength = 5000;
  textarea.required = true;
  label.appendChild(textarea);
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = 'Válasz küldése';
  button.disabled = true;
  const error = document.createElement('p');
  error.className = 'rf-thread-error';
  error.setAttribute('role', 'alert');
  const notice = document.createElement('p');
  notice.setAttribute('role', 'status');
  form.append(label, error, button, notice);
  element.append(heading, replies);
  if (onReply) element.appendChild(form);

  let commentId;
  let sending = false;
  let destroyed = false;
  let controller = null;

  textarea.addEventListener('input', () => {
    button.disabled = sending || !textarea.value.trim();
    notice.textContent = '';
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = textarea.value.trim();
    if (!message || sending) return;
    if (textarea.value.length > 5000) {
      error.textContent = 'A válasz legfeljebb 5000 karakter lehet.';
      return;
    }
    sending = true;
    button.disabled = true;
    textarea.disabled = true;
    button.textContent = 'Küldés…';
    error.textContent = '';
    notice.textContent = '';
    controller = new AbortController();
    try {
      await onReply({ commentId, message, signal: controller.signal });
      if (destroyed) return;
      textarea.value = '';
      notice.textContent = 'Válasz elküldve.';
    } catch (failure) {
      if (destroyed) return;
      error.textContent = failure.status === 410
        ? 'A review link lejárt vagy visszavonták. Kérj új linket a fejlesztőtől.'
        : 'A választ nem sikerült menteni. A szöveg megmaradt, próbáld újra.';
    } finally {
      sending = false;
      if (!destroyed) {
        textarea.disabled = false;
        button.disabled = !textarea.value.trim();
        button.textContent = 'Válasz küldése';
      }
    }
  });

  return {
    element,
    update(comment) {
      commentId = comment.id;
      const items = comment.replies || [];
      heading.textContent = `Beszélgetés · ${items.length} válasz`;
      replies.replaceChildren();
      items.forEach((reply) => {
        const item = document.createElement('li');
        item.className = reply.authorType === 'DEVELOPER' ? 'rf-developer-reply' : '';
        const meta = document.createElement('div');
        const author = document.createElement('strong');
        author.textContent = reply.authorName;
        const role = document.createElement('span');
        role.textContent = reply.authorType === 'DEVELOPER' ? 'Fejlesztő' : 'Ügyfél';
        meta.append(author, role);
        const date = new Date(reply.createdAt);
        if (Number.isFinite(date.getTime())) {
          const time = document.createElement('time');
          time.dateTime = date.toISOString();
          time.textContent = date.toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' });
          meta.appendChild(time);
        }
        const message = document.createElement('p');
        message.textContent = reply.message;
        item.append(meta, message);
        replies.appendChild(item);
      });
    },
    destroy() {
      destroyed = true;
      controller?.abort();
      element.remove();
    },
  };
};
