import { describe, it, expect } from 'vitest';
import { healthCheck } from '../src/modules/health/health.service';

describe('healthCheck', () => {
  it('should return alive status', () => {
    const result = healthCheck();

    expect(result.status).toBe('alive');
    expect(result.pid).toBe(process.pid);
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeTruthy();
  });
});
