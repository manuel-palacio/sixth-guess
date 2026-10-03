import { describe, expect, it } from 'vitest';
import { originFromForwardedFor } from './origin.ts';

describe('originFromForwardedFor', () => {
  it('takes the address Cloud Run appended, ignoring anything the client sent before it', () => {
    expect(originFromForwardedFor('10.9.9.9, 10.8.8.8,203.0.113.7', 'fallback')).toBe('203.0.113.7');
    expect(originFromForwardedFor('203.0.113.7', 'fallback')).toBe('203.0.113.7');
  });

  it('groups IPv6 addresses by their /64, which one user can rotate through freely', () => {
    const a = originFromForwardedFor('2001:2042:37fb:5c00:95ef:fedb:e796:efb6', 'x');
    const b = originFromForwardedFor('2001:2042:37fb:5c00::1', 'x');
    expect(a).toBe('2001:2042:37fb:5c00::/64');
    expect(b).toBe(a);
    expect(originFromForwardedFor('2001:db8::1', 'x')).toBe('2001:db8:0:0::/64');
  });

  it('treats IPv4-mapped IPv6 as plain IPv4', () => {
    expect(originFromForwardedFor('::ffff:203.0.113.7', 'x')).toBe('203.0.113.7');
  });

  it('falls back to the socket address when there is no header', () => {
    expect(originFromForwardedFor(undefined, '::ffff:127.0.0.1')).toBe('127.0.0.1');
    expect(originFromForwardedFor('', '127.0.0.1')).toBe('127.0.0.1');
  });
});
