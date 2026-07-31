// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Error {
			message: string;
			/**
			 * A Strong's number to try instead, when the requested one does not exist. The old error page
			 * made the same offer: ask for H430 and get pointed at G430.
			 */
			alternative?: string;
		}

		interface Locals {
			/** Set by the auth hook when the request carries a valid session cookie. */
			user: Pick<
				User,
				| 'id'
				| 'email'
				| 'displayName'
				| 'role'
				| 'readerColumns'
				| 'readerFontScale'
				| 'readerLayout'
				| 'theme'
			> | null;
			/** Session id, needed to renew or revoke the session. */
			sessionId: string | null;
		}
	}
}

export {};
