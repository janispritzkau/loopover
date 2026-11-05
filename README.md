# Loopover

![Loopover Game](https://repository-images.githubusercontent.com/213859310/dfd40b00-4fd7-11ea-9161-836dba6c576b)

## Project structure

### `src/state/`

Contains most of the higher-level game logic, such as the timer, various events, and many other things.

### `src/game/`

Contains the core game code such as move mechanics, canvas rendering and the scramble algorithm.

### `src/components/`

Reuseable Vue components are placed inside here.

### `src/views/Main.vue`

The overall layout and design of the game is defined here.

## Project setup

Requires Node.js 20.19+ or 22.12+ (`.nvmrc` pins the version used in CI).

```sh
npm install
```

### Compiles and hot-reloads for development
```sh
npm run dev
```

### Compiles and minifies for production
```sh
npm run build
npm run preview # serve the production build locally
```

### Type check
```sh
npm run typecheck
```

### Configuration

Build-time settings are read from `.env` files (see [Vite env variables](https://vite.dev/guide/env-and-mode)).
Put local overrides into `.env.local`.

| Variable | Description |
| --- | --- |
| `VITE_TITLE` | Page title |
| `VITE_API` | Base URL of the sync/authentication API |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_DISCORD_CLIENT_ID` | Discord OAuth client ID |

## Deployment

The site is hosted on Cloudflare (Workers static assets, see `wrangler.jsonc`) and deployed by
`.github/workflows/ci.yml`: pushes to `main` run `wrangler deploy`, PRs from this repository run
`wrangler versions upload` to get a preview URL.

Required setup in the GitHub repository:

- Secrets `CLOUDFLARE_API_TOKEN` (permission "Workers Scripts: Edit") and `CLOUDFLARE_ACCOUNT_ID`.
- Variables `VITE_API`, `VITE_GOOGLE_CLIENT_ID` and `VITE_DISCORD_CLIENT_ID` (build-time config).
- Environments `production` and `preview` (the workflow references both; GitHub creates them on first use).

To serve the site on `loopover.xyz`, add the domain to Cloudflare and enable the `routes` entry in `wrangler.jsonc`.

To try the Cloudflare runtime locally: `npm run build && npx wrangler dev`.

Note: Cloudflare redirects `/oauth-callback.html` to `/oauth-callback` (query string preserved), which
still works for the OAuth popup flow. The redirect URIs registered with Google/Discord stay unchanged.
