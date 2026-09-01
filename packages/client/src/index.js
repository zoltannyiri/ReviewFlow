import { createElementPicker } from './elementPicker.js';
import { createCommentBox } from './commentBox.js';
import { connectReview, createComment, getComments, createReply } from './api.js';
import { createCommentPins, findTargetElementForComment } from './commentPins.js';
import { createCommentPanel } from './commentPanel.js';
import { groupComments } from './commentGroups.js';
import { observePathname } from './navigation.js';
import {
  clearReviewSession, getReviewSessionStorageKey, isRejectedReviewSession,
  readReviewSession, removeReviewSessionFromUrl, storeReviewSession,
  readReviewFocus, removeReviewFocusFromUrl,
} from './reviewSession.js';
import { createReviewToolbar, REVIEW_MODES } from './toolbar.js';
import { createUiRoot } from './uiRoot.js';

let activeReview = null;

const ReviewFlow = {
  init({ apiUrl = 'http://localhost:5000/api', projectKey } = {}) {
    const storageKey = getReviewSessionStorageKey({ apiUrl, projectKey });
    const reviewSession = readReviewSession({ storageKey });
    if (!reviewSession) return;

    activeReview?.destroy();
    const sessionToken = reviewSession.token;
    const ui = createUiRoot();
    let destroyed = false;
    let loadVersion = 0;
    let loadController = null;
    let comments = [];
    let ready = false;
    let connected = false;
    let validated = false;

    const renderComments = () => {
      const groups = groupComments(comments.filter(
        (comment) => comment.pathname === window.location.pathname
      ));
      commentPins.render(groups);
      panel.update(groups);
      return groups;
    };

    const highlightAndFocusElement = (element) => {
      if (!element) return;
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        element.scrollIntoView();
      }

      const rect = element.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.className = 'rf-focus-highlight';
      highlight.setAttribute('data-reviewflow-ui', 'true');
      highlight.style.left = `${Math.max(0, rect.left - 4)}px`;
      highlight.style.top = `${Math.max(0, rect.top - 4)}px`;
      highlight.style.width = `${rect.width + 8}px`;
      highlight.style.height = `${rect.height + 8}px`;
      ui.root.appendChild(highlight);

      const updatePos = () => {
        if (!element.isConnected) return;
        const r = element.getBoundingClientRect();
        highlight.style.left = `${Math.max(0, r.left - 4)}px`;
        highlight.style.top = `${Math.max(0, r.top - 4)}px`;
        highlight.style.width = `${r.width + 8}px`;
        highlight.style.height = `${r.height + 8}px`;
      };
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);

      setTimeout(() => {
        highlight.style.opacity = '0';
        setTimeout(() => {
          window.removeEventListener('scroll', updatePos, true);
          window.removeEventListener('resize', updatePos);
          highlight.remove();
        }, 400);
      }, 3500);
    };

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

    const commentPins = createCommentPins({
      root: ui.root,
      onSelect(group, pin) {
        commentBox.close();
        panel.open(group, pin);
      },
    });

    const picker = createElementPicker({
      enabled: false,
      onSelect(element) {
        if (!ready) return;
        panel.close({ restoreFocus: false });
        commentBox.open(element);
      },
    });

    const toolbar = createReviewToolbar({
      root: ui.root,
      onModeChange(mode) {
        picker.setEnabled(mode === REVIEW_MODES.COMMENTING);
        if (mode === REVIEW_MODES.BROWSING) commentBox.close();
      },
    });

    const commentBox = createCommentBox({
      root: ui.root,
      async onSubmit(payload) {
        const saved = await createComment({ apiUrl, sessionToken, payload });
        if (destroyed) return;
        ++loadVersion;
        comments = [...comments.filter(({ id }) => id !== saved.id), saved];
        const groups = renderComments();
        ui.showToast('Megjegyzés elküldve');

        const newGroup = groups.find((g) => g.comments.some((c) => c.id === saved.id));
        if (newGroup) {
          commentPins.pulse(newGroup.key);
        }

        void loadComments();
      },
    });

    let session;
    const invalidate = () => {
      clearReviewSession({ token: sessionToken, storageKey });
      session.destroy();
    };

    const loadComments = async () => {
      const version = ++loadVersion;
      const pathname = window.location.pathname;
      loadController?.abort();
      loadController = new AbortController();
      ready = false;
      toolbar.setStatus('💬 ReviewFlow – Betöltés…');
      try {
        if (projectKey && !connected) {
          await connectReview({ apiUrl, sessionToken, projectKey, signal: loadController.signal });
          connected = true;
        }
        const loaded = await getComments({
          apiUrl, sessionToken, pathname, signal: loadController.signal,
        });
        if (destroyed || version !== loadVersion || pathname !== window.location.pathname) return;

        comments = loaded;
        ready = true;
        const groups = renderComments();
        toolbar.setStatus('');

        if (!validated) {
          validated = true;
          storeReviewSession({ token: sessionToken, storageKey });
          if (reviewSession.source === 'url') removeReviewSessionFromUrl({});
        }

        // Check for rf_focus param
        const focusCommentId = readReviewFocus();
        if (focusCommentId) {
          const focusComment = comments.find((c) => c.id === focusCommentId);
          if (focusComment) {
            const group = groups.find((g) => g.comments.some((c) => c.id === focusCommentId));
            if (group) {
              const target = findTargetElementForComment(focusComment);
              const pin = commentPins.getPin(group.key);
              if (target) {
                highlightAndFocusElement(target);
                commentPins.pulse(group.key);
                panel.open(group, pin, { focusCommentId });
              } else {
                panel.open(group, pin, {
                  noticeText: 'Az eredeti elem nem található ezen a verzión.',
                  focusCommentId,
                });
              }
            }
          }
          removeReviewFocusFromUrl();
        }
      } catch (error) {
        if (destroyed || error.name === 'AbortError' || version !== loadVersion) return;
        if (isRejectedReviewSession(error)) {
          invalidate();
          return;
        }
        toolbar.setStatus('ReviewFlow – A megjegyzések nem tölthetők be.');
      }
    };

    const navigation = observePathname({
      onChange() {
        if (destroyed) return;
        ready = false;
        comments = [];
        picker.reset();
        commentBox.close();
        panel.close({ restoreFocus: false });
        commentPins.clear();
        void loadComments();
      },
    });

    session = {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        loadController?.abort();
        ++loadVersion;
        navigation.destroy();
        picker.destroy();
        commentBox.destroy();
        commentPins.destroy();
        panel.destroy();
        toolbar.destroy();
        ui.destroy();
        if (activeReview === session) activeReview = null;
      },
    };
    activeReview = session;
    void loadComments();
    return session;
  },
};

export default ReviewFlow;
