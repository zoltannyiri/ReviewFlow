import { createElementPicker } from './elementPicker.js';
import { createCommentBox } from './commentBox.js';
import { connectReview, createComment, getComments, createReply } from './api.js';
import { createCommentPins } from './commentPins.js';
import { createCommentPanel } from './commentPanel.js';
import { groupComments } from './commentGroups.js';
import { observePathname } from './navigation.js';
import {
  clearReviewSession, getReviewSessionStorageKey, isRejectedReviewSession,
  readReviewSession, removeReviewSessionFromUrl, storeReviewSession,
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
        renderComments();
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
        renderComments();
        toolbar.setStatus('');
        if (!validated) {
          validated = true;
          storeReviewSession({ token: sessionToken, storageKey });
          if (reviewSession.source === 'url') removeReviewSessionFromUrl({});
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
