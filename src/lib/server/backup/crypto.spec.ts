import { describe, expect, it } from 'vitest';

process.env.BACKUP_ENCRYPTION_KEY = 'unit-test-key-0123456789abcdefghijklmnop';

const { encryptSecret, decryptSecret, isEncryptionAvailable } = await import('./crypto.ts');

describe('backup secret encryption', () => {
	it('round-trips a secret', () => {
		const token = encryptSecret('super-secret-access-key');
		expect(decryptSecret(token)).toBe('super-secret-access-key');
	});

	it('uses a fresh IV for every call, even for the same input', () => {
		const a = encryptSecret('same-value');
		const b = encryptSecret('same-value');
		expect(a).not.toBe(b);
		expect(decryptSecret(a)).toBe('same-value');
		expect(decryptSecret(b)).toBe('same-value');
	});

	function flipFirstByte(base64url: string): string {
		const bytes = Buffer.from(base64url, 'base64url');
		bytes[0] = bytes[0]! ^ 0xff;
		return bytes.toString('base64url');
	}

	it('rejects a tampered ciphertext', () => {
		const token = encryptSecret('super-secret-access-key');
		const [version, iv, tag, ciphertext] = token.split('.');
		const tampered = [version, iv, tag, flipFirstByte(ciphertext!)].join('.');
		expect(() => decryptSecret(tampered)).toThrow();
	});

	it('rejects a tampered auth tag', () => {
		const token = encryptSecret('super-secret-access-key');
		const [version, iv, tag, ciphertext] = token.split('.');
		const tampered = [version, iv, flipFirstByte(tag!), ciphertext].join('.');
		expect(() => decryptSecret(tampered)).toThrow();
	});

	it('rejects a token in an unknown format', () => {
		expect(() => decryptSecret('not-a-valid-token')).toThrow();
		expect(() => decryptSecret('v2.a.b.c')).toThrow();
	});

	it('reports encryption as available once the key is set', () => {
		expect(isEncryptionAvailable()).toBe(true);
	});
});
