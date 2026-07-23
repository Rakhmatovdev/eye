import { useEffect, useState } from 'react';

// True only after the component has mounted on the client. Use this to gate
// any render output that depends on client-only state seeded synchronously
// from localStorage (e.g. useAuthStore's `user`) — see authStore.ts's
// loadInitial(). That store reads localStorage at module-eval time, so on
// the client its very first value is already the persisted user/token, while
// the server (no localStorage) always rendered as logged-out. Rendering
// `user`-dependent markup unconditionally makes the client's first
// (pre-hydration) render disagree with the server-rendered HTML, which React
// treats as a hydration mismatch — a structural one (extra/missing element)
// throws and forces a full client re-render, not just a console warning.
// Gating with this hook makes both the server and the client's first render
// agree (mounted === false), then a normal effect-driven re-render (outside
// hydration reconciliation) reveals the real content once mounted flips.
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
