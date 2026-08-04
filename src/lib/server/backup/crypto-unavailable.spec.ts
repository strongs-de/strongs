import { describe, expect, it } from 'vitest';

delete process.env.BACKUP_ENCRYPTION_KEY;

const { encryptSecret, isEncryptionAvailable } = await import('./crypto.ts');

describe('backup secret encryption without a configured key', () => {
	it('reports encryption as unavailable', () => {
		expect(isEncryptionAvailable()).toBe(false);
	});

	it('throws a specific error instead of failing silently', () => {
		expect(() => encryptSecret('anything')).toThrow(/BACKUP_ENCRYPTION_KEY/);
	});
});
