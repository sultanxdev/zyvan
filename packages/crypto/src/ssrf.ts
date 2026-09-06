// ─────────────────────────────────────────────────────────────
// Zyvan Crypto — SSRF Protection
// Validates destination URLs to prevent Server-Side Request Forgery.
// This is NOT just url.includes("localhost") — it does actual DNS
// resolution and IP validation.
// ─────────────────────────────────────────────────────────────

import { URL } from 'url';
import dns from 'dns';
import net from 'net';

// Private/reserved IP ranges that must be blocked
const BLOCKED_RANGES = [
  // Loopback
  { prefix: '127.', description: 'Loopback' },
  // Private Class A
  { prefix: '10.', description: 'Private (10.0.0.0/8)' },
  // Private Class B
  { prefix: '172.16.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.17.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.18.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.19.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.20.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.21.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.22.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.23.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.24.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.25.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.26.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.27.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.28.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.29.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.30.', description: 'Private (172.16.0.0/12)' },
  { prefix: '172.31.', description: 'Private (172.16.0.0/12)' },
  // Private Class C
  { prefix: '192.168.', description: 'Private (192.168.0.0/16)' },
  // Link-local
  { prefix: '169.254.', description: 'Link-local' },
  // AWS/Cloud metadata
  { prefix: '169.254.169.254', description: 'Cloud metadata endpoint' },
  // IPv6 loopback
  { prefix: '::1', description: 'IPv6 Loopback' },
  // Broadcast
  { prefix: '0.0.0.0', description: 'Unspecified' },
  { prefix: '255.255.255.255', description: 'Broadcast' },
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
];

export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
  resolvedIp?: string;
}

/**
 * Check if an IP address is in a blocked range.
 */
function isBlockedIp(ip: string): string | null {
  for (const range of BLOCKED_RANGES) {
    if (ip.startsWith(range.prefix) || ip === range.prefix) {
      return range.description;
    }
  }

  // Additional check: is it a private IPv4 in the 172.16-31 range?
  const parts = ip.split('.');
  if (parts.length === 4) {
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    if (first === 172 && second >= 16 && second <= 31) {
      return 'Private (172.16.0.0/12)';
    }
  }

  return null;
}

/**
 * Validate a destination URL for SSRF safety.
 *
 * - Requires HTTPS
 * - Resolves hostname to IP
 * - Blocks private/reserved IP ranges
 * - Blocks known dangerous hostnames
 *
 * @param urlString - The URL to validate
 * @returns SsrfValidationResult
 */
export async function validateUrl(urlString: string): Promise<SsrfValidationResult> {
  let parsed: URL;

  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // Require HTTPS in production (allow HTTP in development for testing)
  if (parsed.protocol !== 'https:' && process.env.NODE_ENV !== 'development') {
    return { safe: false, reason: 'URL must use HTTPS' };
  }

  // Check blocked hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { safe: false, reason: `Blocked hostname: ${hostname}` };
  }

  // If hostname is already an IP, validate directly
  if (net.isIP(hostname)) {
    const blockedReason = isBlockedIp(hostname);
    if (blockedReason) {
      return { safe: false, reason: `Blocked IP range: ${blockedReason}` };
    }
    return { safe: true, resolvedIp: hostname };
  }

  // Resolve hostname to IP addresses
  try {
    const addresses = await new Promise<string[]>((resolve, reject) => {
      dns.resolve4(hostname, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });

    // Check ALL resolved IPs (DNS can return multiple)
    for (const ip of addresses) {
      const blockedReason = isBlockedIp(ip);
      if (blockedReason) {
        return {
          safe: false,
          reason: `Hostname ${hostname} resolves to blocked IP (${ip}): ${blockedReason}`,
        };
      }
    }

    return { safe: true, resolvedIp: addresses[0] };
  } catch {
    return { safe: false, reason: `Failed to resolve hostname: ${hostname}` };
  }
}
