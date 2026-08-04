/**
 * Where the end-to-end mail outbox lives.
 *
 * A module of its own, free of side effects — same reasoning as `test-database.ts` — since
 * `playwright.config.ts`, `scripts/prepare-e2e.ts` and the e2e specs themselves all need this path.
 *
 * Registration and password-reset send a real link by mail; with no `BREVO_API_KEY` configured for
 * e2e, the app's `loggingMailer` never actually delivers it. Only the token's hash is ever stored in
 * the database, so there is no way to recover the link from there either. Setting `MAIL_TEST_OUTBOX`
 * to this path makes the app mirror every "sent" mail here as JSON lines, which the e2e specs read
 * directly since the webServer they drive runs on the same host.
 */
export const MAIL_TEST_OUTBOX = './var/e2e-mail-outbox.jsonl';
