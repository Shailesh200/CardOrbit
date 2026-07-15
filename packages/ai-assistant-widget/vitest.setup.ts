import '@testing-library/jest-dom/vitest';

Element.prototype.scrollTo = function scrollTo() {
  // jsdom stub for chat auto-scroll
};
