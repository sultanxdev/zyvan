// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Anti-SSRF URL & IP Validator
//
// Blocks requests to internal networks, cloud metadata services,
// loopback addresses, link-local, and reserved IP ranges.
//
// Protection Matrix:
//   1. Scheme validation (only http/https)
//   2. Hostname blacklist (localhost, metadata, etc.)
//   3. DNS resolution with ALL-addresses check (IPv4 & IPv6)
//   4. Private, loopback, link-local, carrier NAT, cloud metadata block
//   5. IPv4-mapped IPv6 de-encapsulation (::ffff:x.x.x.x)
// ─────────────────────────────────────────────────────────────

import dns from 'dns';
import net from 'net';

export interface ValidatedDestination {
  resolvedIp: string;
  isIpv6: boolean;
  parsedUrl: URL;
}

/**
 * Checks if an IPv4 address is within private, loopback, link-local,
 * carrier-grade NAT, or reserved ranges.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid format treated as unsafe
  }

  const [a, b, c] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (RFC 1918 Private)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata: 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (RFC 1918 Private)
  if (a === 192 && b === 168) return true;

  // 100.64.0.0/10 (Carrier-grade NAT: 100.64.0.0 - 100.127.255.255)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use: 240.0.0.0 - 255.255.255.254)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is within private, loopback, link-local,
 * documentation, or multicast ranges.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 (Loopback)
  if (normalized === '::1') return true;

  // :: (Unspecified)
  if (normalized === '::') return true;

  // IPv4-mapped IPv6: ::ffff:x.x.x.x or ::ffff:hex
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.substring(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
    // Also check hex notation like ::ffff:7f00:1
    return true;
  }

  // fc00::/7 (Unique Local Address / Private)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // fe80::/10 (Link-Local)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  // ff00::/8 (Multicast)
  if (normalized.startsWith('ff')) return true;

  // 2001:db8::/32 (Documentation)
  if (normalized.startsWith('2001:db8') || normalized.startsWith('2001:0db8')) return true;

  return false;
}

/**
 * Validates whether an IP (v4 or v6) is private or reserved.
 */
export function isPrivateOrUnsafeIP(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) {
    return isPrivateIPv4(ip);
  }
  if (family === 6) {
    return isPrivateIPv6(ip);
  }
  return true; // Not a valid IP -> unsafe
}

/**
 * Validates a target URL and resolves its DNS hostname.
 * Checks ALL resolved IP addresses. If ANY address is private or reserved,
 * rejects the destination to prevent DNS-rebinding attacks.
 */
export async function validateDestinationUrl(rawUrl: string): Promise<ValidatedDestination> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid webhook URL format: ${rawUrl}`);
  }

  // 1. Validate Scheme
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol '${parsedUrl.protocol}'. Only http: and https: are allowed.`);
  }

  // Disallow user:pass credentials in webhook URLs
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Webhook URLs must not contain embedded user credentials.');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 2. Reject obvious dangerous hostnames immediately
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error(`Forbidden destination hostname: ${hostname}`);
  }

  // 3. Direct IP Address in URL
  if (net.isIP(hostname)) {
    if (isPrivateOrUnsafeIP(hostname)) {
      throw new Error(`Forbidden destination IP address: ${hostname}`);
    }
    return {
      resolvedIp: hostname,
      isIpv6: net.isIPv6(hostname),
      parsedUrl,
    };
  }

  // 4. Resolve DNS — check ALL returned records
  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(hostname, { all: true });
  } catch (err: any) {
    throw new Error(`DNS resolution failed for host '${hostname}': ${err.message}`);
  }

  if (!records || records.length === 0) {
    throw new Error(`No DNS records found for host '${hostname}'`);
  }

  // If ANY resolved IP is private/reserved, reject immediately!
  for (const record of records) {
    if (isPrivateOrUnsafeIP(record.address)) {
      throw new Error(
        `SSRF Protection: Host '${hostname}' resolved to prohibited IP address (${record.address})`
      );
    }
  }

  const primary = records[0];
  return {
    resolvedIp: primary.address,
    isIpv6: primary.family === 6,
    parsedUrl,
  };
}
