// Include the page in every key: IDs are only unique within a page.
export const getCommentGroupKey = (comment) => {
  let identity;

  if (comment.reviewElementId) {
    identity = ['review', comment.reviewElementId];
  } else if (comment.elementId) {
    identity = ['id', comment.elementId];
  } else {
    const position = [
      comment.elementX,
      comment.elementY,
      comment.elementWidth,
      comment.elementHeight,
    ];

    // Do not merge unrelated comments with missing position data.
    identity = position.every(Number.isFinite)
      ? ['position', comment.tagName, ...position,
        comment.viewportWidth, comment.viewportHeight]
      : ['comment', comment.id];
  }

  return JSON.stringify([comment.pathname, ...identity]);
};

export const getCommentGroupTitle = (group) => {
  const comment = group.comments[group.comments.length - 1];

  return comment.elementText?.trim() ||
    comment.reviewElementId || comment.elementId ||
    comment.tagName || 'Kijelölt elem';
};

export const groupComments = (comments) => {
  const groups = new Map();

  // The API returns comments in creation order; preserve that order.
  comments.forEach((comment) => {
    const key = getCommentGroupKey(comment);

    if (!groups.has(key)) {
      groups.set(key, { key, comments: [] });
    }

    groups.get(key).comments.push(comment);
  });

  return [...groups.values()];
};
