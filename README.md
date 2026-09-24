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
- Limits each user to five generated images per Pacific calendar day.
- Keeps uploads, generated images, and conversation history in the browser tab;
  images are not stored by this frontend.

## Architecture

```text
Browser ──chat──▶ TODD backend /api/image-creator/chat
        ──plan──▶ TODD backend /api/image-creator/generate
                         └─ OpenAI Images API → base64 PNG → browser
```

The backend authenticates requests with a verified Firebase ID token. Firestore
stores only the per-user daily usage counter at
`imageCreatorUsage/{uid}`. Backend implementation lives in
`taliferrotech/todd-backend/functions/imageCreator.service.js` and
`imageCreatorRoutes.js`.

### Backend configuration

| Variable | Default | Description |
|---|---:|---|
| `IMAGE_CREATOR_DAILY_LIMIT` | `5` | Images allowed per user per Pacific day |
| `IMAGE_CREATOR_IMAGE_MODEL` | `gpt-image-1` | OpenAI image model |
| `IMAGE_CREATOR_QUALITY` | `medium` | `low`, `medium`, or `high` |

## Development

```bash
npm install
npm start                 # http://localhost:4200
npm run build             # production bundle
npm run typecheck         # TypeScript validation
npm run test:ci           # Angular unit tests in ChromeHeadless
npm run e2e               # Cypress smoke tests against local dev server
```

Local development calls the production API at `api.taliferro.tech`, so backend
changes must be deployed before chat or image generation can work locally.

## Deployment

The deployment script bumps the build version (`YYYY.M.D-build.N`, via the
`prebuild` script), then runs the production build, unit tests, Cypress tests,
and TypeScript validation. If every step passes, it commits any pending changes
as `Deploy: v<version>` and deploys to Firebase. Push the commit to GitHub
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
