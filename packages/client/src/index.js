import { createElementPicker } from './elementPicker.js';
import { createCommentBox } from './commentBox.js';
import { createComment, getComments, createReply } from './api.js';
import { createCommentPins } from './commentPins.js';
import { createCommentPanel } from './commentPanel.js';
import { groupComments } from './commentGroups.js';
import { createUiRoot } from './uiRoot.js';

let activeReview = null;

const ReviewFlow = {
  init({ apiUrl = 'http://localhost:5000/api' } = {}) {
    const sessionToken = new URLSearchParams(
      window.location.search
    ).get('rf_session');

    if (!sessionToken) return;

    activeReview?.destroy();
    const ui = createUiRoot();
    const panel = createCommentPanel({
      root: ui.root,
      async onReply({ commentId, message, signal }) {
        const reply = await createReply({ apiUrl, sessionToken, commentId, message, signal });
        if (destroyed || signal.aborted) return;
        ++loadVersion;
        comments = comments.map((comment) => comment.id === commentId
          ? { ...comment, replies: [...(comment.replies || []).filter((item) => item.id !== reply.id), reply] }
          : comment);
        renderComments();
        void loadComments();
      },
    });
    let destroyed = false;
    let loadVersion = 0;
    let comments = [];

    const toolbar = document.createElement('div');
    toolbar.setAttribute('data-reviewflow-ui', 'true');
    const toolbarLabel = '💬 ReviewFlow – Review mód';
    toolbar.textContent = toolbarLabel;
    Object.assign(toolbar.style, {
      position: 'fixed', top: '16px', left: '50%',
      transform: 'translateX(-50%)', zIndex: '1',
      background: '#111827', color: '#ffffff',
      padding: '10px 16px', borderRadius: '10px',
      maxWidth: 'calc(100% - 32px)',
      fontFamily: 'Arial, sans-serif', fontSize: '14px',
      boxShadow: '0 4px 20px rgba(0,0,0,.25)',
    });
    ui.root.appendChild(toolbar);

    const commentPins = createCommentPins({
      root: ui.root,
      onSelect(group, pin) {
        commentBox.close();
        panel.open(group, pin);
      },
    });

    const renderComments = () => {
      const groups = groupComments(comments.filter(
        (comment) => comment.pathname === window.location.pathname
      ));
      commentPins.render(groups);
      panel.update(groups);
    };

    const loadComments = async () => {
      const version = ++loadVersion;
      const pathname = window.location.pathname;
      try {
        const loaded = await getComments({ apiUrl, sessionToken, pathname });
        if (destroyed || version !== loadVersion ||
            pathname !== window.location.pathname) return;

        comments = loaded;
        renderComments();
        toolbar.textContent = toolbarLabel;
      } catch {
        if (destroyed || version !== loadVersion) return;
        toolbar.textContent = 'ReviewFlow – A megjegyzések nem tölthetők be.';
      }
    };

    const commentBox = createCommentBox({
      root: ui.root,
      async onSubmit(payload) {
        // Let the composer display failures and retain the draft for retry.
        const saved = await createComment({ apiUrl, sessionToken, payload });
        if (destroyed) return;

        // Update immediately, even if reloading the list subsequently fails.
        ++loadVersion;
        comments = [...comments.filter(({ id }) => id !== saved.id), saved];
        renderComments();
        void loadComments();
      },
    });

    const picker = createElementPicker({
      onSelect(element) {
        panel.close({ restoreFocus: false });
        commentBox.open(element);
      },
    });

    const session = {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        ++loadVersion;
        picker.destroy();
        commentBox.destroy();
        commentPins.destroy();
        panel.destroy();
        ui.destroy();
        activeReview = null;
      },
    };
    activeReview = session;
    void loadComments();
    return session;
  },
};

export default ReviewFlow;
