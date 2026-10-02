# Inventory (merged)

**Live Demo:** [https://inventory-app-fz17.vercel.app](https://inventory-app-fz17.vercel.app)
(`frontend/client`, on Vercel) — the `/assets` page talks to `backend/`'s
API, live on Render with its own managed Postgres
([`inventory-api-guxd.onrender.com`](https://inventory-api-guxd.onrender.com/api/v1),
see `backend/docs/DEPLOYMENT.md`). The room register at `/` needs its own
PHP + MySQL API (`frontend/server/`), which isn't deployed anywhere yet —
run it locally (see `frontend/README.md`) to see that part.

This repo merges two previously separate projects into one home for the
same inventory product:

- **`frontend/`** — formerly [`fazal305/inventory-app`](https://github.com/fazal305/inventory-app):
  a React single-page app, plus its own small PHP + MySQL API (`frontend/server/`)
  for a simple staff hardware **room register** (add a device, see which
  room it's in, move it, retire it). Also keeps the original multi-page
  PHP version for reference (`frontend/legacy/`).
- **`backend/`** — formerly [`fazal305/inventory-api`](https://github.com/fazal305/inventory-api):
  a standalone, backend-first PHP + MySQL REST API with its own bearer-token
  auth, originally scoped to bulk retail stock (categories/products CRUD
  with search/filter/sort/pagination).

Each still runs as its own PHP process with its own database — merging the
repos did not merge the two apps into one service. See **Asset management**
below for how they now relate.

## Why this merge, and the asset-management gap

Asset management — tracking individual, identifiable items (not just stock
counts) — is this product's priority feature. Reading both halves before
merging found:

- **`frontend/server/`** (the room register) already modeled individual
  assets, but only three fields: `item_name`, `category`, `room_number`.
  No status, no assignment, no purchase/warranty info, no history.
- **`backend/`** (inventory-api) had *no* asset-level model at all — only
  bulk `products` (name, SKU, price, quantity) and `categories`. Its own
  README listed this explicitly as future, unbuilt scope.

Neither half supported real asset management (status, assignment, location,
purchase/warranty, an audit trail) on its own. Per the project owner, this
was extended in `backend/` — see below — rather than left as a gap, since a
backend-first REST API with proper modeling, validation, and a test suite
was the better foundation to build it on than the room register's minimal
schema.

### What was added

`backend/` gained a new `assets` resource, in addition to its existing
`categories`/`products`:

| Field | Notes |
|---|---|
| `asset_tag` | required, unique |
| `name` | required |
| `category_id` | optional (assets don't require a category) |
| `serial_number` | optional, unique when present |
| `status` | `in_use` \| `in_storage` \| `under_repair` \| `retired` \| `disposed` |
| `assigned_to` | free text — person, department, or similar |
| `location` | free text |
| `purchase_date`, `purchase_cost`, `warranty_expires_at` | purchase/warranty info |
| `notes` | free text |

Every create, and every update that changes `status` or `assigned_to`,
appends a row to a new `asset_status_history` table (previous/new status,
previous/new assignment, who made the change, when) — a full audit trail,
not just the asset's current state.

Endpoints (full reference: [`backend/docs/API.md`](backend/docs/API.md)):

| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/assets` (search/status/category filter/sort/pagination) | — |
| GET | `/api/v1/assets/{id}` | — |
| GET | `/api/v1/assets/{id}/history` | required |
| POST / PUT / PATCH / DELETE | `/api/v1/assets[/{id}]` | required |

`frontend/`'s React app gained a new **`/assets`** page (additive — the
existing room register at `/` is unchanged) that calls these endpoints
directly: a list view with tag/status/assigned-to/location, a form to add
an asset, a simple edit form for status/assignment/location, and a history
viewer. See [`frontend/client/src/pages/Assets.jsx`](frontend/client/src/pages/Assets.jsx).

Because `backend/` has its own bearer-token accounts (separate from
`frontend/server/`'s session-based staff accounts), the Assets page has its
own small sign-in step the first time — register a backend account with
`POST /api/v1/auth/register` (see `backend/docs/API.md`) to use it.

## Running it locally

The two halves are independent services; run whichever you need.

### `frontend/` — room register (React + its own PHP API)

```bash
cd frontend
mysql -u root -e "CREATE DATABASE staff_assets; CREATE USER 'assets_app'@'localhost' IDENTIFIED BY 'choose-a-password'; GRANT ALL ON staff_assets.* TO 'assets_app'@'localhost';"
cp server/.env.example server/.env        # then set DB_PASS
php server/bin/migrate.php
php server/bin/create-staff.php your.name # prompts for a password
php server/bin/seed-sample-assets.php     # optional sample data

cd client && npm install
```

Two terminals, for hot reload:

```bash
php -S 127.0.0.1:8080 -t frontend/server/public frontend/server/router.php   # room register API
cd frontend/client && npm run dev                                           # http://localhost:5173
```

Full details, including the production build and environment variables:
[`frontend/README.md`](frontend/README.md).

### `backend/` — asset-management + products API (PHP, token auth)

```bash
cd backend
cp .env.example .env     # edit DB credentials if needed
mysql -u root -e "CREATE DATABASE inventory_api CHARACTER SET utf8mb4;"
php database/migrate.php
php database/seeders/seed.php   # optional: sample categories, products, and 5 sample assets
php -S 127.0.0.1:8000 -t public public/index.php
```

The API is now at `http://127.0.0.1:8000/api/v1`. Register an account to
get a token:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"you@example.com","password":"a-strong-password"}'
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password"}'
```

Full details, including Postgres support and deployment notes:
[`backend/README.md`](backend/README.md).

### Running both together (to use the `/assets` page)

With `backend/` running on `:8000` and `frontend/`'s dev server proxying
`/backend-api` to it (`frontend/client/vite.config.js`, default target
`http://127.0.0.1:8000`), start `frontend/client`'s dev server, sign in to
the room register, then open **Asset management** in the header nav — it
will prompt for the backend account created above. For a production build
where `frontend/` and `backend/` are deployed to different origins, set
`VITE_BACKEND_API_URL` at build time (see `frontend/client/.env.example`)
and add that origin to `backend/.env`'s `CORS_ALLOWED_ORIGINS`.

## Testing

```bash
# frontend/server (room register API)
php frontend/server/tests/run.php
cd frontend/client && npm run build

# backend (categories/products/assets API)
cd backend && php tests/run.php   # needs the dev server + a migrated/seeded database running
```

Every changed/added PHP file in this merge passes `php -l`; the frontend
build (`npm run build`) succeeds. Neither test suite was run end to end in
the environment this merge was done in, since no MySQL/Postgres server was
available there.

## Repository history

This repo is the former `fazal305/inventory-app`, with `fazal305/inventory-api`
merged in under `backend/`. `fazal305/inventory-api` is no longer updated —
its final state is preserved in `backend/`'s git history here.
