import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import api from '../api/api';

const ReviewPage = () => {
  const { token } = useParams();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReview = async () => {
      try {
        console.log('TOKEN:', token);
console.log('TOKEN LENGTH:', token?.length);
        const response = await api.get(`/review/${token}`);

        setReview(response.data.review);
      } catch (error) {
        const message =
          error.response?.data?.message ||
          'A review nem tölthető be.';

        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadReview();
  }, [token]);

  if (loading) {
    return <div>Betöltés...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>{review.project.name}</h1>

      <h2>{review.reviewRound.name}</h2>

      <p>
        Verzió: {review.reviewRound.version}
      </p>

      <p>
        Állapot: {review.reviewRound.status}
      </p>

      <button
        onClick={() => {
          window.location.href =
            `${review.reviewRound.targetUrl}` +
            `?rf_session=${encodeURIComponent(token)}`;
        }}
      >
        Review megnyitása
      </button>
    </div>
  );
};

export default ReviewPage;