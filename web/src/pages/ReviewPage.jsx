import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { buildReviewTarget } from '@reviewflow/client/reviewUrl';
import api from '../api/api';
import './DeveloperCommentsPage.css';

export default function ReviewPage() {
  const { token } = useParams();
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/review/' + encodeURIComponent(token), { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      const href = buildReviewTarget(data.review.reviewRound.targetUrl, token);
      setResult({ token, review: data.review, href });
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ token, error: error.response?.status === 410
        ? 'Ez a review link lejárt vagy visszavonták. Kérj új linket a fejlesztőtől.'
        : 'A review nem érhető el. Ellenőrizd a linket, vagy próbáld újra később.' });
    });
    return () => controller.abort();
  }, [token]);
  const current = result?.token === token ? result : null;
  return <div className="developer-page"><main>
    <div className="dev-brand"><span aria-hidden="true">RF</span> ReviewFlow</div>
    {!current ? <p role="status">Review betöltése…</p> : current.error ? <p role="alert">{current.error}</p>
      : <section className="dev-card dev-review-landing">
        <p className="dev-eyebrow">Meghívás véleményezésre</p>
        <h1>{current.review.project.name}</h1>
        <h2>{current.review.reviewRound.name}</h2>
        <p>A következő oldalon kattints arra az elemre, amelyhez megjegyzést szeretnél írni. ReviewFlow-fiók nem szükséges.</p>
        <p className="dev-url">Céloldal: {current.review.reviewRound.targetUrl}</p>
        <a className="dev-link-button" href={current.href} rel="noreferrer">Review megnyitása</a>
        <p className="dev-small dev-muted">Ha nem jelenik meg a ReviewFlow sáv, jelezd a fejlesztőnek: az SDK beépítése szükséges. A céloldal külön belépést is kérhet.</p>
      </section>}
  </main></div>;
}
