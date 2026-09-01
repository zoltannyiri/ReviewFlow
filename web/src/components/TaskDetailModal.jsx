import { useState } from 'react';
import { buildReviewTarget } from '@reviewflow/client/reviewUrl';
import CommentReplies from './CommentReplies.jsx';

const STATUS_LABELS = {
  TODO: 'Teendő',
  IN_PROGRESS: 'Folyamatban',
  ON_HOLD: 'Várakozik',
  DONE: 'Kész',
};

const formatTime = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' })
    : '';
};

export default function TaskDetailModal({
  task,
  round,
  client,
  onClose,
  onStatusChange,
  onCommentUpdated,
  onSessionExpired,
}) {
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');
  const [draft, setDraft] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState('');

  if (!task) return null;

  const comment = task.comment;

  const openOnWebsite = async () => {
    setOpening(true);
    setOpenError('');
    try {
      const { data } = await client.createPreview(round.id);
      const url = buildReviewTarget(round.targetUrl, data.preview.token, {
        pathname: comment?.pathname || '/',
        focusCommentId: comment?.id,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setOpenError('Nem sikerült megnyitni a céloldalt. Próbáld újra.');
    } finally {
      setOpening(false);
    }
  };

  const handleReply = async () => {
    if (!draft.trim() || replyBusy || !comment) return;
    setReplyBusy(true);
    setReplyError('');
    try {
      const { data } = await client.replyToComment(comment.id, draft.trim());
      const updatedReplies = [...(comment.replies || []), data.reply];
      onCommentUpdated?.({
        ...comment,
        replies: updatedReplies,
      });
      setDraft('');
    } catch (err) {
      if (err.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setReplyError(
        err.response?.status === 404
          ? 'A megjegyzés már nem érhető el.'
          : 'A választ nem sikerült menteni. Próbáld újra.'
      );
    } finally {
      setReplyBusy(false);
    }
  };

  return (
    <div className="dev-modal-backdrop" onClick={onClose}>
      <div className="dev-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="dev-modal-header">
          <div>
            <span className={`dev-status-badge status-${task.status}`}>
              {STATUS_LABELS[task.status] || task.status}
            </span>
            <h2 style={{ margin: '8px 0 0' }}>{task.title}</h2>
          </div>
          <button className="dev-modal-close" onClick={onClose} aria-label="Bezárás">
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            Státusz:
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value)}
              style={{ width: 'auto', padding: '6px 10px' }}
            >
              <option value="TODO">Teendő (TODO)</option>
              <option value="IN_PROGRESS">Folyamatban (IN PROGRESS)</option>
              <option value="ON_HOLD">Várakozik (ON HOLD)</option>
              <option value="DONE">Kész (DONE)</option>
            </select>
          </label>

          <button
            type="button"
            className="dev-primary"
            disabled={opening}
            onClick={openOnWebsite}
          >
            {opening ? 'Megnyitás…' : 'Megnyitás az oldalon'}
          </button>
        </div>
        {openError && <p role="alert" className="dev-error">{openError}</p>}

        <div className="dev-card" style={{ background: '#f8fafc' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#475569' }}>Ügyfél visszajelzése</h3>
          <p style={{ fontSize: '15px', whiteSpace: 'pre-wrap', margin: '0 0 10px' }}>
            {comment?.comment || task.title}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', color: '#64748b', fontSize: '13px' }}>
            <span>Oldal: <code>{comment?.pathname || '/'}</code></span>
            {comment?.elementText && <span>Elem szövege: <strong>„{comment.elementText}”</strong></span>}
            <span>Létrehozva: {formatTime(task.createdAt)}</span>
          </div>
        </div>

        {comment && (
          <details>
            <summary>Technikai részletek</summary>
            <dl>
              <dt>HTML-elem</dt><dd>{comment.tagName || '–'}</dd>
              <dt>data-review-id</dt><dd>{comment.reviewElementId || '–'}</dd>
              <dt>HTML id</dt><dd>{comment.elementId || '–'}</dd>
              <dt>Nézet</dt><dd>{comment.viewportWidth} × {comment.viewportHeight}</dd>
              <dt>Koordináták</dt><dd>X: {comment.elementX}, Y: {comment.elementY}</dd>
            </dl>
          </details>
        )}

        {comment && (
          <div className="dev-thread">
            <h4>Megbeszélés ({comment.replies?.length || 0})</h4>
            <CommentReplies
              comment={comment}
              draft={draft}
              error={replyError}
              busy={replyBusy}
              onDraftChange={setDraft}
              onSubmit={handleReply}
            />
          </div>
        )}
      </div>
    </div>
  );
}
