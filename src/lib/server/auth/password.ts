/**
 * Password hashing.
 *
 * Argon2id with the parameters OWASP suggests for interactive logins. The cost is deliberately felt:
 * ~50 ms per verification is invisible to a person signing in and ruinous to anyone working through a
 * leaked password list.
 */

import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id. The library exposes its `Algorithm` enum as an ambient const enum, which cannot be
 * referenced under `verbatimModuleSyntax`, so the value is spelled out: 0 is Argon2d, 1 Argon2i,
 * 2 Argon2id.
 */
const ARGON2ID = 2;

const OPTIONS = {
	algorithm: ARGON2ID,
	memoryCost: 19_456, // 19 MiB
	timeCost: 2,
	parallelism: 1
} as const;

export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
	return hash(password, OPTIONS);
}

/**
 * Checks a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed hash, so a corrupted row cannot turn a failed
 * login into a 500.
 */
export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
	try {
		return await verify(storedHash, password, OPTIONS);
	} catch {
		return false;
	}
}

let dummy: Promise<string> | undefined;

/**
 * A real hash of a random value, used to spend the same time verifying a password for an address that
 * has no account as for one that does.
 *
 * It has to be a genuine Argon2 hash: verifying a malformed one fails immediately, which would make
 * "no such account" measurably faster than "wrong password" and hand out account existence for free.
 */
export function dummyHash(): Promise<string> {
	dummy ??= hash(randomBytes(24).toString('base64'), OPTIONS);
	return dummy;
}

export type PasswordProblem = 'tooShort' | null;

export function checkPasswordStrength(password: string): PasswordProblem {
	return password.length < MIN_PASSWORD_LENGTH ? 'tooShort' : null;
}
