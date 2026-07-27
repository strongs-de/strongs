# Operations

## Deploying

`compose.yaml` is the whole stack: the app, PostgreSQL 17 and a nightly `pg_dump` sidecar. Add it in
Coolify as a **Docker Compose** resource, assign a domain to the `app` service, and set:

| Variable                    | Where it comes from                                             |
| --------------------------- | --------------------------------------------------------------- |
| `SERVICE_PASSWORD_POSTGRES` | Coolify generates it; shared by app, database and backups       |
| `SERVICE_BASE64_64_SESSION` | Coolify generates it; signs session cookies                     |
| `BREVO_API_KEY`             | Brevo; without it, mails are written to the log instead of sent |
| `MAIL_FROM`                 | must be a sender Brevo has verified                             |
| `BOOTSTRAP_ADMIN_EMAIL`     | the first account registered with this address becomes an admin |

Migrations run in the container's entrypoint before the server starts, so a deploy that changes the
schema needs nothing extra. A failed migration stops the boot, and the healthcheck keeps the old
container serving.

### First deployment

1. Deploy. The site comes up with no translations and says so.
2. Register with the address in `BOOTSTRAP_ADMIN_EMAIL`; that account gets the admin role.
3. Import through `/admin/import`, or from a checkout with `pnpm data:import` against the production
   `DATABASE_URL`.

## Backups

The `backup` service runs `pg_dump` nightly into the `backups` volume, keeping 30 daily, 8 weekly and 12
monthly dumps.

Verifying a backup — worth doing once now rather than for the first time in an emergency:

```sh
# newest dump
docker compose exec backup ls -t /backups/daily | head -1

# restore it into a scratch database
docker compose exec db createdb -U strongs restore_check
docker compose exec backup sh -c 'gunzip -c /backups/daily/<file>.sql.gz' \
  | docker compose exec -T db psql -U strongs -d restore_check

# sanity check, then drop it
docker compose exec db psql -U strongs -d restore_check -c \
  'select count(*) from verses; select count(*) from verse_lists;'
docker compose exec db dropdb -U strongs restore_check
```

Only user data is irreplaceable. Translations can be re-imported from their source files, which is why
uploads are archived in the `uploads` volume — back that up too, or keep the sources elsewhere.

## Upgrading

**Application**: push, and Coolify redeploys. Migrations run on boot.

**PostgreSQL major version**: the data directory is not compatible across major versions, so dump,
recreate and restore:

```sh
docker compose exec db pg_dump -U strongs -Fc strongs > strongs.dump
docker compose down
docker volume rm strongs_pgdata     # only after checking the dump is complete
# raise the image version in compose.yaml, then
docker compose up -d db
docker compose exec -T db pg_restore -U strongs -d strongs --clean --if-exists < strongs.dump
docker compose up -d
```

## When something is wrong

**The site returns 503 and the healthcheck fails.** `/healthz` executes a query, so this means the
database is unreachable: `docker compose logs db`, `docker compose ps`.

**An import sits at "running".** It was interrupted by a restart. Jobs in that state are marked failed at
the next boot; restart the app container and retry the import.

**A translation reads oddly after an import.** Look at the warnings on the job in `/admin/import` first —
duplicated verses and unusable Strong's references are reported there. Then reimport: the original upload
is kept, so the same file can be run again from `/admin`.

**Search returns nothing for a word that is definitely there.** The vocabulary and statistics views are
refreshed after an import; if one was interrupted they can be stale. "Statistiken neu berechnen" on
`/admin/resources` rebuilds them and runs `ANALYZE`.

**Logins are refused with "Zu viele Versuche".** The throttle allows 8 failures per account and 30 per
address in 15 minutes, and rows age out on their own. To clear it immediately:
`delete from login_attempts;`.

**Someone cannot receive the reset mail.** `/admin/users` issues a one-time link and shows it on screen.

## Log lines worth alerting on

Logs are JSON on stdout, collected by Coolify.

- `"slow request"` — a request over 500 ms, with its path. A handful during an import is expected;
  a steady stream means a query has lost its index.
- `"import failed"` — with the reason.
- `"mail not sent: BREVO_API_KEY is not configured"` — password resets are silently not arriving.
