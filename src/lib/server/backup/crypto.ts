/**
 * Encryption for the S3 secret access key stored in the `settings` table.
 *
 * Unlike API keys and session tokens (`repositories/api-keys.ts`), which are one-way SHA-256 hashes
 * because they are only ever verified, the S3 secret must be replayed against the storage provider,
 * so it has to be reversible. The threat model this addresses is a leaked `pg_dump` of the database
 * itself — which is exactly why the encryption key lives in the environment, not in the database.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from '../config.ts';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TOKEN_VERSION = 'v1';

function encryptionKey(): Buffer {
	const secret = config().BACKUP_ENCRYPTION_KEY;
	if (!secret) {
		throw new Error(
			'BACKUP_ENCRYPTION_KEY ist nicht gesetzt — automatische Backups nach S3 können nicht ' +
				'konfiguriert werden.'
		);
	}
	// SHA-256 turns an arbitrary-length secret into exactly the 32 bytes aes-256-gcm needs, the same
	// "any string with enough entropy" ergonomics as SESSION_SECRET.
	return createHash('sha256').update(secret).digest();
}

export function isEncryptionAvailable(): boolean {
	return config().BACKUP_ENCRYPTION_KEY !== undefined;
}

/** `v1.<iv-b64url>.<tag-b64url>.<ciphertext-b64url>` */
export function encryptSecret(plaintext: string): string {
	const key = encryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();

	return [
		TOKEN_VERSION,
		iv.toString('base64url'),
		tag.toString('base64url'),
		ciphertext.toString('base64url')
	].join('.');
}

export function decryptSecret(token: string): string {
	const key = encryptionKey();
	const parts = token.split('.');
	if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) {
		throw new Error('Der gespeicherte Zugangsschlüssel hat ein unbekanntes Format.');
	}
	const [, ivPart, tagPart, ciphertextPart] = parts as [string, string, string, string];

	try {
		const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, 'base64url'));
		decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
		return Buffer.concat([
			decipher.update(Buffer.from(ciphertextPart, 'base64url')),
			decipher.final()
		]).toString('utf8');
	} catch (error) {
		throw new Error(
			'Der gespeicherte Zugangsschlüssel kann nicht entschlüsselt werden (falscher oder ' +
				'geänderter BACKUP_ENCRYPTION_KEY).',
			{ cause: error }
		);
	}
}
