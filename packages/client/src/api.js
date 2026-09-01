export const createComment = async ({
  apiUrl,
  sessionToken,
  payload,
}) => {
  const response = await fetch(
    `${apiUrl}/review/${encodeURIComponent(sessionToken)}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: payload.comment,

        pathname: payload.element.pathname,
        tagName: payload.element.tagName,

        reviewElementId:
          payload.element.reviewId || null,

        elementId:
          payload.element.id || null,

        elementText:
          payload.element.text || null,

        viewportWidth:
          payload.element.viewportWidth,

        viewportHeight:
          payload.element.viewportHeight,

        elementRect:
          payload.element.elementRect,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'Comment could not be saved'
    );
  }

  return data.comment;
};

export const getComments = async ({
  apiUrl,
  sessionToken,
  pathname,
  signal,
}) => {
  const response = await fetch(
    `${apiUrl}/review/${encodeURIComponent(sessionToken)}/comments?pathname=${encodeURIComponent(pathname)}`,
    { signal }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || 'Comments could not be loaded'
    );
    error.status = response.status;
    throw error;
  }

  return data.comments;
};

export const connectReview = async ({ apiUrl, sessionToken, projectKey, signal }) => {
  const response = await fetch(`${apiUrl}/review/${encodeURIComponent(sessionToken)}/connection`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectKey }),
  });
  if (!response.ok) {
    const error = new Error('SDK connection rejected');
    error.status = response.status;
    throw error;
  }
};

export const createReply = async ({ apiUrl, sessionToken, commentId, message, signal }) => {
  const response = await fetch(
    `${apiUrl}/review/${encodeURIComponent(sessionToken)}/comments/${encodeURIComponent(commentId)}/replies`,
    {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }
  );
  if (!response.ok) {
    const error = new Error('Reply could not be saved');
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return data.reply;
};
