import '@testing-library/jest-dom';

// JSDOM does not implement media queries or native modal dialog methods.
Object.defineProperty(window, 'matchMedia', { writable: true, value: jest.fn(query => ({
  matches: false, media: query, onchange: null,
  addListener: jest.fn(), removeListener: jest.fn(),
  addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
})) });
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };

// `next/navigation`'s App Router hooks (`useRouter`, `usePathname`,
// `useSearchParams`) throw outside a real Next.js router context, and most
// page components in this app call `useRouter()` unconditionally. Mock the
// module globally so every test gets working, jest.fn()-backed stand-ins
// without each test file having to remember to do it.
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
}));
