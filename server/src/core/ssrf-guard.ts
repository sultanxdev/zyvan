import dns from 'dns/promises';

/**
 * Private / reserved IP ranges that must never be called from a worker.
 * Blocking these prevents SSRF attacks where an attacker registers an endpoint
 * pointing to an internal service (e.g., AWS metadata at 169.254.169.254).
 */
const BLOCKED_RANGES = [
    /^10\./,                          // RFC-1918 private
    /^172\.(1[6-9]|2\d|3[01])\./,   // RFC-1918 private
    /^192\.168\./,                    // RFC-1918 private
    /^127\./,                         // Loopback
    /^169\.254\./,                    // Link-local (AWS metadata)
    /^0\./,                           // "This" network
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // RFC-6598 shared address space
    /^::1$/,                          // IPv6 loopback
    /^fc00:/,                         // IPv6 unique local
    /^fe80:/,                         // IPv6 link-local
];

/**
 * Checks whether a URL is safe to use as a webhook destination.
 *
 * Rules:
 *  1. URL must use HTTPS (no plain HTTP)
 *  2. The hostname must resolve to at least one public IP
 *  3. None of the resolved IPs must fall in a private/reserved range
 *
 * Note: DNS resolution is done at registration time — this is a best-effort
 * check and does NOT prevent all DNS rebinding attacks.
 * For production use, route workers through a dedicated egress proxy with
 * IP-level filtering applied at the network layer.
 */
export async function isSafeUrl(url: string): Promise<boolean> {
    try {
        const parsed = new URL(url);

        // Require HTTPS
        if (parsed.protocol !== 'https:') {
            return false;
        }

        // Resolve hostname to IPs
        let addresses: string[] = [];
        try {
            addresses = await dns.resolve4(parsed.hostname);
        } catch {
            // If IPv4 fails, try IPv6
            try {
                const v6 = await dns.resolve6(parsed.hostname);
                addresses = v6;
            } catch {
                return false; // Cannot resolve → unsafe
            }
        }

        if (addresses.length === 0) return false;

        // Check every resolved IP against blocked ranges
        for (const ip of addresses) {
            if (BLOCKED_RANGES.some((range) => range.test(ip))) {
                return false;
            }
        }

        return true;
    } catch {
        return false; // Malformed URL or unexpected error → unsafe
    }
}

/**
 * Synchronous check for known-unsafe URLs (no DNS lookup).
 * Fast pre-check to reject obviously bad inputs before doing async DNS work.
 */
export function isHttpsUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
}
