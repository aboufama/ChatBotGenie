// Mock implementation of react-dom for React Native
const reactDomMock = {
  render: () => {},
  unmountComponentAtNode: () => {},
  findDOMNode: () => {},
  createPortal: (children) => children,
  flushSync: (fn) => fn(),
  // Additional APIs that might be required
  unstable_batchedUpdates: (callback) => callback(),
};

module.exports = reactDomMock; 