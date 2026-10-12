<p align="center">
  <img src="public/todd-icon.png" alt="TODD" width="120">
</p>

<h1 align="center">TODD Image Creator</h1>

<p align="center">Describe the image you want. TODD creates it.</p>

TODD Image Creator is a browser-based image workspace. A signed-in user chats
with TODD to create logos, icons, illustrations, and other images, optionally
attaching a logo or reference image to guide the result.

## What it does

- Uses a conversational workflow to clarify an image request and create it.
- Accepts logo and example-image attachments as references.
- Returns downloadable PNG images directly in the browser.
- Requires TODD authentication.
- Limits each workspace to five generated images per Pacific calendar day
  (configurable per workspace), then draws on purchased image credits.
- Keeps uploads, generated images, and conversation history in the browser tab;
  images are not stored by this frontend.

## Architecture

```text
Browser ──chat──▶ TODD backend /api/image-creator/chat
        ──plan──▶ TODD backend /api/image-creator/generate
                         └─ OpenAI Images API → base64 PNG → browser
```

The frontend is an Angular 19 app. It calls these backend endpoints, all under
`https://api.taliferro.tech/api`:

| Endpoint | Purpose |
|---|---|
| `GET /image-creator/usage` | Today's used/remaining image count |
| `POST /image-creator/chat` | One conversation turn with TODD |
| `POST /image-creator/generate` | Create the image |
| `POST /billing/checkout-credits` | Start a Stripe checkout for image credits |

Sign-in goes through TODD's hosted login (`todd.taliferro.tech/login`), which
redirects back to `/auth/callback` with a Firebase custom token. The backend
authenticates every request with a verified Firebase ID token.

Backend implementation lives in the `taliferrotech` repo at
`todd-backend/functions/imageCreator.service.js` and `imageCreatorRoutes.js`.
Firestore holds only:

- `imageCreatorUsage/{tenantId}`: the per-workspace daily usage counter
- `tenants/{tenantId}.imageCreatorDailyLimit`: optional per-workspace limit override
- `creditBalances/{tenantId}.image`: purchased image credits

### Backend configuration

Set on the `api` Cloud Function in the `taliferrotech` Firebase project:

| Variable | Default | Description |
|---|---:|---|
| `OPENAI_API_KEY` | (required) | OpenAI key for chat and image generation |
| `IMAGE_CREATOR_DAILY_LIMIT` | `5` | Images per workspace per Pacific day |
| `IMAGE_CREATOR_IMAGE_MODEL` | `gpt-image-2` | OpenAI image model |
| `IMAGE_CREATOR_QUALITY` | `high` | `low`, `medium`, `high`, or `auto` |
| `IMAGE_CREATOR_CHAT_MODEL` | `gpt-4o-mini` | Model for the conversation |

### Frontend configuration

There are no `.env` files. All frontend settings live in
`src/environments/environment.ts` (development) and `environment.prod.ts`
(production): the backend URL, the Taliferro tenant ID used for admin checks,
and the Firebase web config. The Firebase web config is public by design;
access is enforced by Firebase Auth and the backend. `VERSION` is read from
`package.json`.

## Development

### Prerequisites

- Node.js 20.11+ or 22 (Angular 19) and npm
- Google Chrome, for unit tests (ChromeHeadless) and Cypress
- The Firebase CLI (`npm install -g firebase-tools`), only to deploy or run the
  Hosting emulator, with access to the `taliferrotech` project
- A TODD account to sign in with

### Shared UI package

The app depends on `@taliferro/ui` installed from a local folder
(`"file:../../taliferro-ui"`), so `npm install` fails unless that repo is
checked out two levels up:

```text
corporate/
├── taliferro-ui/              # git clone https://github.com/tshowers/taliferro-ui.git
└── web-products/
    └── image-creator/         # this repo
```

Some files here are copies synced from `taliferro-ui` and say so in a
`SYNCED FROM` comment at the top: the platform menu, site footer, "Also from
us", product pages, and sound service. Change those in `taliferro-ui` and run
its `sync.sh`, not here.

### Run it

```bash
npm install
npm start                 # http://localhost:4200
npm run typecheck         # TypeScript validation
npm run test:ci           # Angular unit tests in ChromeHeadless
npm run e2e               # Cypress smoke tests against local dev server
npm run build             # production bundle (also bumps the build version)
```

Use port 4200. Hosted login only redirects back to
`http://localhost:4200/auth/callback`, and the backend only accepts that
local origin.

Local development calls the production API at `api.taliferro.tech`, so backend
changes must be deployed before chat or image generation can work locally.
Images you create locally count against your workspace's real daily limit. To
test past it, raise `imageCreatorDailyLimit` on your tenant document.

### Static pages and SEO

`/`, `/help`, and `/about` are prerendered to static HTML at build time
(`src/app/app.routes.server.ts`) so search engines can read them; every other
route is rendered in the browser. The home page prerenders as the signed-out
page. For people who were signed in last visit, `src/index.html` hides it until
the app has rendered, so they don't see a "Sign in" flash.
`public/sitemap.xml` and `public/robots.txt` list the public pages.

### Automatic updates

Each build writes its version to `public/assets/version.json`. The running app
checks that file every minute and when the tab comes back into view. When a new
version is deployed, it reloads automatically, except for a signed-in person on
the creator page, who would lose their conversation and images; they get a
"Refresh" notice instead. `firebase.json` serves HTML and `version.json` with
`no-cache` so a reload always gets the new build.

## Deployment

The deployment script bumps the build version (`YYYY.M.D-build.N`, via the
`prebuild` script), then runs the production build, checks that the home, Help,
and About pages were prerendered, and runs unit tests, Cypress tests, and
TypeScript validation. If every step passes, it commits any pending changes as
`Deploy: v<version>` and deploys to Firebase. Push the commit to GitHub
afterward with `git push`.

```bash
./deploy.sh
```

The app is deployed to the Firebase Hosting site `todd-image-creator` in the
`taliferrotech` project and is available at:

`https://images.taliferro.tech`

The backend can be deployed separately from the `todd-backend` project with:

```bash
firebase deploy --only functions:api
```
