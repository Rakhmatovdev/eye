# Ko'z — User Panel

The analyst-facing web application for **Ko'z**, a Palantir-style intelligence &
data analytics platform. This is the "user panel" module — one of three
independent repos that make up the platform (Go backend on `:8080`, this
Next.js user panel on `:3001`, and a separate Vite admin panel on `:3000`).

It gives analysts a single workspace for entity search, link-analysis graphs,
a geospatial map, live sensor surveillance, a military command post, an
AI analyst chat, a case-timeline view, and case-file management — all backed
by real API calls to the Go backend, with graceful demo-data fallbacks if a
particular endpoint is unreachable.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **TanStack Query** for server state / caching
- **Zustand** for client state (auth session, locale)
- **axios** for HTTP, with a shared client (`src/lib/apiClient.ts`) that
  attaches the bearer token and silently refreshes it on `401`
- **Cytoscape.js** for the link-analysis graph
- **Yandex Maps JS API 2.1** when configured, with a professional Leaflet/
  OpenStreetMap fallback for the geospatial map
- **Recharts** for charts

## Prerequisites

- Node.js 20+
- The Ko'z backend running locally on `:8080` (see the `backend` repo) — or
  any reachable instance, pointed at via `BACKEND_URL`.

No database, Docker, or WSL setup is required for the frontend itself — it
only talks to the backend over HTTP/WebSocket.

## How API calls work

The browser never talks to the backend directly. `next.config.js` proxies
`/api/*` to `BACKEND_URL` (defaults to `http://localhost:8080`) via Next's
`rewrites()`, so all requests are same-origin from the browser's point of
view — no CORS to configure. The shared axios client in
`src/lib/apiClient.ts` is based at `/api/v1`, so API modules call short paths
like `apiClient.get('/entities')`.

To point at a different backend, set an env var before starting the dev
server:

```
BACKEND_URL=http://localhost:9090 npm run dev
```

## Getting started

```bash
npm install
npm run dev
```

The app runs at **http://localhost:3001**.

## Build

```bash
npm run build
npm start   # serves the production build on :3001
```

## Default logins

Seeded by the backend on first run:

| Role    | Email                 | Password     |
|---------|------------------------|---------------|
| Admin   | `admin@platform.io`    | `Admin123!`   |
| Analyst | `analyst@platform.io`  | `Analyst123!` |

## Localization

The app chrome (nav, login, settings, common buttons) supports **Uzbek
(default), Russian, and English** via a small dependency-free dictionary in
`src/lib/i18n.ts` plus a persisted locale in `src/store/localeStore.ts`. A
UZ/RU/EN switcher lives in the sidebar header. Page-body copy is being
migrated to `useT()` incrementally; anything not yet wired up renders in
English.

## Page map

| Route               | Description                                                   |
|----------------------|----------------------------------------------------------------|
| `/login`             | Auth (email/password, MFA challenge if enabled)                |
| `/dashboard`         | Analyst home / overview                                        |
| `/search`            | Global entity search & filters                                 |
| `/entity/[id]`       | 360° entity dossier — attributes, sightings, connections, timeline, edit/delete |
| `/graph/[caseId]`    | Cytoscape link-analysis graph, with a case-entities side panel  |
| `/map`               | Multi-provider geospatial map, live detections, sensor coverage, search, GPS, measurement and replay |
| `/surveillance`      | Live sensor feed (WebSocket, `LIVE` badge, auto-reconnect)      |
| `/command`           | Military Command Post (COP) tactical map                       |
| `/timeline`          | Cross-entity event timeline                                    |
| `/cases`             | Case files — status changes, delete                             |
| `/assistant`         | AI analyst chat, pre-populated with past chat history           |
| `/settings`          | Account info, change password, MFA enroll/verify/disable        |

## Environment

| Var | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | Server-side only — where `/api/*` is proxied to. |
| `NEXT_PUBLIC_API_URL` | *(empty)* | Override only if calling the backend directly (bypassing the proxy); leave unset for the normal same-origin setup. |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | *(empty)* | Enables Yandex Maps on `/map`; without it the OpenStreetMap provider is used. Restrict this browser-visible key by HTTP Referer in the Yandex developer console. |

The Yandex provider includes address search, clustering, traffic, map/satellite/
hybrid types, geolocation, fullscreen mode and a ruler. The provider selector
falls back to OpenStreetMap automatically if the key is absent or Yandex fails
to initialize. OpenStreetMap mode includes street, dark and topographic layers.
Both providers show platform entities, sensor coverage, WebSocket detections,
GPS position, click coordinates and two-point distance measurement. Analysts
can also draw a geofence to calculate its area and count contained map objects,
run a configurable 500 m–25 km radius search, and export the currently visible
operational layers and analysis shapes as GeoJSON.

## Docker

```bash
docker build -t koz-frontend .
docker run -p 3001:3001 -e BACKEND_URL=http://host.docker.internal:8080 koz-frontend
```
