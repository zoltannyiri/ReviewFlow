import { useEffect, useRef, useState } from 'react';
import { useDeveloperResource } from '../hooks/useDeveloperResource.js';
import { buildReviewTarget } from '@reviewflow/client/reviewUrl';
import CommentReplies from './CommentReplies.jsx';

const formatTime = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' })
    : '';
};

export default function RoundComments({ client, roundId, onSessionExpired }) {
  const resource = useDeveloperResource(client, `/rounds/${roundId}/comments`, onSessionExpired);
  const [status, setStatus] = useState('ALL');
  const [pathname, setPathname] = useState('');
  const [pending, setPending] = useState([]);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState({});
  const [replyErrors, setReplyErrors] = useState({});
  const [openingCommentId, setOpeningCommentId] = useState(null);
  const requests = useRef(new Map());

  useEffect(() => {
    const active = requests.current;
    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);

  const openOnWebsite = async (comment) => {
    if (!resource.data?.reviewRound) return;
    setOpeningCommentId(comment.id);
    setNotice('');
    try {
      const { data } = await client.createPreview(roundId);
      const url = buildReviewTarget(resource.data.reviewRound.targetUrl, data.preview.token, {
        pathname: comment.pathname || '/',
        focusCommentId: comment.id,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setErrors((current) => ({
        ...current,
        [comment.id]: 'Nem sikerült megnyitni a céloldalt. Próbáld újra.',
      }));
    } finally {
      setOpeningCommentId(null);
    }
  };

  const resolve = async (commentId) => {
    if (requests.current.has(commentId)) return;
    const controller = new AbortController();
    requests.current.set(commentId, controller);
    setPending((current) => [...current, commentId]);
    setErrors((current) => ({ ...current, [commentId]: '' }));
    setNotice('');
    try {
      const { data } = await client.resolveComment(commentId, { signal: controller.signal });
      if (controller.signal.aborted) return;
      resource.setData((current) => ({
        ...current,
        comments: current.comments.map((comment) =>
          comment.id === commentId ? data.comment : comment
        ),
      }));
      setNotice('A megjegyzés megoldottnak jelölve.');
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setErrors((current) => ({
        ...current,
        [commentId]: error.response?.status === 404
          ? 'A megjegyzés már nem érhető el, vagy megszűnt a hozzáférésed.'
          : 'A módosítást nem sikerült menteni. Próbáld újra.',
      }));
    } finally {
      requests.current.delete(commentId);
      if (!controller.signal.aborted) setPending((current) => current.filter((id) => id !== commentId));
    }
  };

  const reply = async (commentId) => {
    const message = drafts[commentId]?.trim();
    if (!message || requests.current.has(commentId)) return;
    const controller = new AbortController();
    requests.current.set(commentId, controller);
    setPending((current) => [...current, commentId]);
    setReplyErrors((current) => ({ ...current, [commentId]: '' }));
    setNotice('');
    try {
      const { data } = await client.replyToComment(commentId, message, { signal: controller.signal });
      if (controller.signal.aborted) return;
      resource.setData((current) => ({
        ...current,
        comments: current.comments.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                replies: [
                  ...(comment.replies || []).filter((item) => item.id !== data.reply.id),
                  data.reply,
                ],
              }
            : comment
        ),
      }));
      setDrafts((current) => ({ ...current, [commentId]: '' }));
      setNotice('A válasz elküldve.');
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.response?.status === 401) {
        onSessionExpired();
        return;
      }
      setReplyErrors((current) => ({
        ...current,
        [commentId]: error.response?.status === 404
          ? 'A megjegyzés már nem érhető el, vagy megszűnt a hozzáférésed.'
          : 'A választ nem sikerült menteni. Próbáld újra.',
      }));
    } finally {
      requests.current.delete(commentId);
      if (!controller.signal.aborted) setPending((current) => current.filter((id) => id !== commentId));
    }
  };

  if (resource.loading) return <p role="status">Megjegyzések betöltése…</p>;
  if (resource.error)
    return (
      <div className="dev-card">
        <p className="dev-error" role="alert">{resource.error}</p>
        <button onClick={resource.refresh}>Újrapróbálás</button>
      </div>
    );
  if (!resource.data) return null;

  const { comments, reviewRound } = resource.data;
  const resolved = comments.filter((comment) => comment.status === 'RESOLVED').length;
  const paths = [...new Set(comments.map((comment) => comment.pathname))].sort();
  const visible = comments.filter(
    (comment) =>
      (status === 'ALL' || comment.status === status) &&
      (!pathname || comment.pathname === pathname)
  );

  return (
    <section aria-labelledby="comments-title">
      <div className="dev-section-heading">
        <div>
          <p className="dev-eyebrow">Review #{reviewRound.version} · {reviewRound.status}</p>
          <h2 id="comments-title">{reviewRound.name}</h2>
          <p className="dev-muted" aria-live="polite">
            {resolved} / {comments.length} megoldva · {comments.length - resolved} nyitott
          </p>
        </div>
        <button onClick={resource.refresh} disabled={pending.length > 0}>
          Lista frissítése
        </button>
      </div>

      <div className="dev-filters">
        <label>
          Állapot
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Összes megjegyzés</option>
            <option value="OPEN">Nyitott</option>
            <option value="RESOLVED">Megoldott</option>
          </select>
        </label>
        <label>
          Oldal
          <select value={pathname} onChange={(event) => setPathname(event.target.value)}>
            <option value="">Minden oldal</option>
            {paths.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && <p className="dev-success" role="status">{notice}</p>}

      {visible.length === 0 && (
        <p className="dev-card dev-muted">
          {comments.length === 0
            ? 'Ebben a review körben még nincs megjegyzés.'
            : 'Nincs a szűrésnek megfelelő megjegyzés.'}
        </p>
      )}

      <ul className="dev-comments">
        {visible.map((comment, index) => {
          const isResolved = comment.status === 'RESOLVED';
          const isOpening = openingCommentId === comment.id;

          return (
            <li key={comment.id} className="dev-card">
              <article aria-label={`Megjegyzés #${index + 1}`}>
                <div className="dev-comment-heading">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="dev-card-number">#{index + 1}</span>
                    <span className={`dev-badge ${isResolved ? 'is-resolved' : ''}`}>
                      {isResolved ? 'Megoldott' : 'Nyitott'}
                    </span>
                  </div>

                  <div className="dev-actions">
                    <button
                      type="button"
                      className="dev-btn-focus"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      disabled={isOpening}
                      onClick={() => openOnWebsite(comment)}
                    >
                      {isOpening ? 'Megnyitás…' : 'Megnyitás az oldalon'}
                    </button>

                    {!isResolved && (
                      <button
                        className="dev-primary"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                        disabled={pending.includes(comment.id)}
                        onClick={() => resolve(comment.id)}
                      >
                        {pending.includes(comment.id) ? 'Mentés…' : 'Megoldva'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ margin: '14px 0 10px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#0f172a' }}>
                    {comment.comment}
                  </h3>
                </div>

                <div className="dev-comment-meta" style={{ marginBottom: '14px' }}>
                  <span>Oldal: <code>{comment.pathname}</code></span>
                  {comment.elementText && (
                    <span>Cél elem: <strong>„{comment.elementText}”</strong></span>
                  )}
                  <span>Típus: <code>&lt;{comment.tagName}&gt;</code></span>
                  <time dateTime={comment.createdAt}>{formatTime(comment.createdAt)}</time>
                </div>

                <details>
                  <summary>Technikai részletek</summary>
                  <dl>
                    <dt>HTML-elem</dt><dd>{comment.tagName}</dd>
                    <dt>data-review-id</dt><dd>{comment.reviewElementId || '–'}</dd>
                    <dt>HTML id</dt><dd>{comment.elementId || '–'}</dd>
                    <dt>Nézet</dt><dd>{comment.viewportWidth} × {comment.viewportHeight}</dd>
                    <dt>Koordináták</dt><dd>X: {comment.elementX}, Y: {comment.elementY}</dd>
                  </dl>
                </details>

                {errors[comment.id] && (
                  <p role="alert" className="dev-error" style={{ margin: '10px 0' }}>
                    {errors[comment.id]}
                  </p>
                )}

                <CommentReplies
                  comment={comment}
                  draft={drafts[comment.id] || ''}
                  error={replyErrors[comment.id]}
                  busy={pending.includes(comment.id)}
                  onDraftChange={(value) =>
                    setDrafts((current) => ({ ...current, [comment.id]: value }))
                  }
                  onSubmit={() => reply(comment.id)}
                />
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
