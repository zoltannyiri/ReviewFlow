const formatTime = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' }) : '';
};

export default function CommentReplies({ comment, draft, error, busy, onDraftChange, onSubmit }) {
  const replies = comment.replies || [];
  return (
    <section className="dev-thread" aria-label="Beszélgetés">
      <h4>Beszélgetés · {replies.length} válasz</h4>
      <ol className="dev-replies">
        {replies.map((reply) => (
          <li key={reply.id} className={`dev-reply ${reply.authorType === 'DEVELOPER' ? 'is-developer' : ''}`}>
            <div className="dev-reply-meta">
              <strong>{reply.authorName}</strong>
              <span>{reply.authorType === 'DEVELOPER' ? 'Fejlesztő' : 'Ügyfél'}</span>
              <time dateTime={reply.createdAt}>{formatTime(reply.createdAt)}</time>
            </div>
            <p className="dev-comment-body">{reply.message}</p>
          </li>
        ))}
      </ol>
      <form className="dev-reply-form" onSubmit={(event) => {
        event.preventDefault();
        if (draft.trim() && !busy) onSubmit();
      }}>
        <label htmlFor={`reply-${comment.id}`}>Válasz szövege</label>
        <textarea id={`reply-${comment.id}`} value={draft} maxLength={5000} required
          disabled={busy} placeholder="Írd le a választ…"
          onChange={(event) => onDraftChange(event.target.value)} />
        {error && <p role="alert" className="dev-error">{error}</p>}
        <button type="submit" disabled={busy || !draft.trim()}>
          {busy ? 'Mentés…' : 'Válasz küldése'}
        </button>
      </form>
    </section>
  );
}
