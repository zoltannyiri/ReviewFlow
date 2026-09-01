const IGNORE_ATTRIBUTE = 'data-reviewflow-ui';

export const createElementPicker = ({
  onSelect,
  enabled = true,
}) => {
  const highlight = document.createElement('div');

  highlight.setAttribute(
    IGNORE_ATTRIBUTE,
    'true'
  );

  Object.assign(highlight.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483646',
    border: '2px solid #3b82f6',
    background: 'rgba(59, 130, 246, 0.08)',
    display: 'none',
    borderRadius: '3px',
  });

  document.body.appendChild(highlight);

  let currentElement = null;
  let pickerEnabled = enabled;

  const isReviewFlowElement = (element) => {
    return Boolean(
      element?.closest?.(
        `[${IGNORE_ATTRIBUTE}]`
      )
    );
  };

  const handlePointerMove = (event) => {
    if (!pickerEnabled) return;
    const element = document.elementFromPoint(
      event.clientX,
      event.clientY
    );

    if (
      !element ||
      element === document.body ||
      element === document.documentElement ||
      isReviewFlowElement(element)
    ) {
      highlight.style.display = 'none';
      currentElement = null;
      return;
    }

    currentElement = element;

    const rect =
      element.getBoundingClientRect();

    Object.assign(highlight.style, {
      display: 'block',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  };

  const handleClick = (event) => {
    if (
      !pickerEnabled ||
      !currentElement ||
      event.composedPath().some(isReviewFlowElement)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const rect =
      currentElement.getBoundingClientRect();

    const data = {
      tagName: currentElement.tagName.toLowerCase(),

      reviewId:
        currentElement.dataset.reviewId ||
        null,

      id:
        currentElement.id ||
        null,

      text:
        currentElement.innerText
          ?.trim()
          .slice(0, 300) ||
        null,

      pathname:
        window.location.pathname,

      pageUrl:
        window.location.origin +
        window.location.pathname,

      viewportWidth:
        window.innerWidth,

      viewportHeight:
        window.innerHeight,

      elementRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    };

    console.log(
      'ReviewFlow selected element:',
      data
    );

    onSelect?.(data);
  };

  document.addEventListener(
    'pointermove',
    handlePointerMove
  );

  document.addEventListener(
    'click',
    handleClick,
    true
  );

  return {
    setEnabled(nextEnabled) {
      pickerEnabled = Boolean(nextEnabled);
      if (!pickerEnabled) {
        highlight.style.display = 'none';
        currentElement = null;
      }
    },
    reset() {
      highlight.style.display = 'none';
      currentElement = null;
    },
    destroy() {
      document.removeEventListener(
        'pointermove',
        handlePointerMove
      );

      document.removeEventListener(
        'click',
        handleClick,
        true
      );

      highlight.remove();
    },
  };
};
