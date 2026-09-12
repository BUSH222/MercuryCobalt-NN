# Mercury Cobalt

React/TypeScript application in `MercuryCobaldFrontend`. Computation and saved
scenarios live in the browser. The one exception is the optional "Advanced
(terrain, WGS84)" earth model: it calls a small FastAPI proxy (`terrain_api/`,
`main.py`) that fetches and caches real elevation data from OpenTopography —
see `MercuryCobaldFrontend/HOW_IT_WORKS.md` for how it fits together. Nothing
else in the app makes a network call.

## Deploy with Docker

Install Docker Engine with the Compose v2 plugin (or Docker Desktop using Linux
containers). From the repository root:

```sh
docker compose up -d --build --wait
```

Open http://localhost:8080 (or your server's address on port 8080). No local Node,
Python, dependency installation, or configuration file is required. The first
build needs internet access to download images and npm packages.

```sh
docker compose ps
docker compose logs --tail=100 web
docker stats --no-stream
docker compose down
```

For public HTTPS, route your TLS reverse proxy to port 8080; this container
serves HTTP. Optionally copy `.env.example` to `.env` to change the port, bind
address, image tag, memory limit, or build heap allowance. Defaults work without
that file. For a proxy running directly on the host, `BIND_ADDRESS=127.0.0.1`
restricts direct access.

## Dependencies and updates

The image installs dependencies using **`npm i`**, then runs `npm run build`.
Both `package.json` and `package-lock.json` participate in the dependency cache;
changes to either trigger installation. Source changes trigger compilation.
The lockfile remains an input to `npm i`; installation does not force every
package to its latest release or write changes back into your checkout.

When editing dependencies locally, run `npm i` in `MercuryCobaldFrontend` and
commit both manifests together. Rebuild to deploy source or package changes:

```sh
git pull --ff-only
docker compose build --pull
docker compose up -d --wait
```

Building separately keeps the running container in place if compilation fails.
The replacement has a brief interruption; this is not a rolling deployment.
To force installation, use `docker compose build --pull --no-cache`.
Base image tags track Node 24 and stable Nginx; `--pull` fetches their updates.
For audited releases, pin base image digests and retain a tested release image.
The Docker deployment GitHub Actions workflow builds and smoke-tests the image
on pushes and pull requests, including health, SPA routing, and cache headers.

Before replacing a known-good deployment, preserve its image:

```sh
docker image tag mercury-cobalt:local mercury-cobalt:previous
```

To roll back, set `IMAGE_TAG=previous` in `.env` and run:

```sh
docker compose up -d --no-build --pull never --wait
```

Use the actual current tag instead of `local` if customized. Restore
`IMAGE_TAG=local` before the next normal build; retain the rollback image until
the new deployment is verified. Saved scenarios remain in browser storage
across replacements; keep the same browser origin (scheme, hostname, and port).
Already-open tabs may need refreshing if they request an old lazy-loaded chunk.
HTML revalidates on navigation; fingerprinted assets are cached for a year.

## Resource use and isolation

Only Nginx and compiled static files ship in the runtime image. Nginx uses one
worker, a 128 MB container memory ceiling, no additional swap allowance, and a
16 MB temporary filesystem. Logs rotate at 10 MB with three files retained.
These are limits, not measured RAM requirements or a performance guarantee.

Compilation needs more RAM than serving: allow approximately 2 GB on the build
host as a starting point and measure for your workload. `NODE_BUILD_HEAP_MB`
defaults to 1024 and caps only the JavaScript heap, not total build memory.
The runtime memory limit does not constrain image builds. For a small server,
build elsewhere and transfer/publish the image. Browser simulation and 3D
rendering still depend on the user's device.

The runtime uses a non-root user, read-only root filesystem, dropped Linux
capabilities, and disabled privilege escalation. Temporary files go to `/tmp`.
`/healthz` supplies the container health check. The restart policy handles
process exits and host restarts; unhealthy status alone does not restart a
container. See the [Compose service reference](https://docs.docker.com/reference/compose-file/services/)
for these resource and isolation settings.

The terrain backend is deployed separately, per the pattern above: a second
`terrain` container (same `Dockerfile`, `target: backend`), reachable by the
frontend only through nginx's `/api/` proxy — it has no host-mapped port of
its own. It boots and serves `/healthz` without any secret configured; only
`GET /api/terrain` needs `OPENTOPOGRAPHY_API_KEY` (get a free key at
opentopography.org), supplied via `.env`/environment at deploy time, never
baked into the image or committed. Its on-disk cache lives in the
`terrain_cache` named volume, so it survives container recreation. Environment
files are excluded from the build context. Future Vite variables must be wired
in at build time and are public browser configuration, never secrets.

## Local development

```sh
cd MercuryCobaldFrontend
npm i
npm run dev
```

Use Node 24. Root Python tooling uses uv, Ruff, and ty; `sh setup.sh` installs
its pre-commit hooks.

To also use the "Advanced (terrain, WGS84)" earth model locally (optional —
every other feature works without it), run the terrain backend alongside the
frontend:

```sh
uv run uvicorn main:app --reload --port 8000
```

Vite's dev server proxies `/api/*` to `http://127.0.0.1:8000` (see
`vite.config.ts`), so the frontend needs no configuration either way. Put
`OPENTOPOGRAPHY_API_KEY=...` in a `.env` file at the repository root (see
`.env.example`) — without it the backend still runs, and only switching to
advanced mode in Settings surfaces a clear error.
