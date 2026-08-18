import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from '../src/utils/jwt';

describe('JWT utils', () => {
  it('should sign and verify token', () => {
    const payload = { userId: 1, username: 'test', roleId: 1 };
    const token = generateToken(payload);

    expect(token).toBeTruthy();

    const decoded = verifyToken(token) as any;
    expect(decoded.userId).toBe(1);
    expect(decoded.username).toBe('test');
  });

  it('should throw on invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });
});
