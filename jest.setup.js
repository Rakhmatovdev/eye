import '@testing-library/jest-dom';

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
