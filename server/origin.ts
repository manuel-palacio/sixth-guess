const IPV4_MAPPED = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;

/**
 * The connection a request came from, for limiting fresh attempts. Cloud Run appends the real client
 * address as the last X-Forwarded-For entry; anything before it was supplied by the client and can be forged.
 */
export function originFromForwardedFor(forwardedFor: string | undefined, socketAddress: string): string {
  const appended = forwardedFor?.split(',').pop()?.trim();
  return normalize(appended || socketAddress);
}

function normalize(address: string): string {
  const mapped = IPV4_MAPPED.exec(address);
  if (mapped) return mapped[1];
  return address.includes(':') ? ipv6Network(address) : address;
}

/** One subscriber usually holds a whole /64, so addresses within it count as the same origin. */
function ipv6Network(address: string): string {
  const [head, tail = ''] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = address.includes('::') && tail ? tail.split(':') : [];
  const missing = Math.max(0, 8 - headGroups.length - tailGroups.length);
  const groups = address.includes('::') ? [...headGroups, ...Array(missing).fill('0'), ...tailGroups] : headGroups;
  return `${groups.slice(0, 4).map((group) => group.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`;
}
