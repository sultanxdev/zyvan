import { describe, it, expect, vi } from 'vitest';
import {
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateOrUnsafeIP,
  validateDestinationUrl,
} from '../../services/ssrf-validator';
import dns from 'dns';

describe('SSRF Validator Unit Tests', () => {
  describe('isPrivateIPv4', () => {
    it('detects loopback addresses', () => {
      expect(isPrivateIPv4('127.0.0.1')).toBe(true);
      expect(isPrivateIPv4('127.255.255.254')).toBe(true);
    });

    it('detects cloud metadata and link-local addresses', () => {
      expect(isPrivateIPv4('169.254.169.254')).toBe(true);
      expect(isPrivateIPv4('169.254.0.1')).toBe(true);
    });

    it('detects RFC 1918 private subnets', () => {
      expect(isPrivateIPv4('10.0.0.1')).toBe(true);
      expect(isPrivateIPv4('10.255.255.255')).toBe(true);
      expect(isPrivateIPv4('172.16.0.1')).toBe(true);
      expect(isPrivateIPv4('172.31.255.255')).toBe(true);
      expect(isPrivateIPv4('192.168.1.1')).toBe(true);
    });

    it('detects carrier-grade NAT (100.64.0.0/10)', () => {
      expect(isPrivateIPv4('100.64.0.1')).toBe(true);
      expect(isPrivateIPv4('100.127.255.255')).toBe(true);
    });

    it('allows public IPv4 addresses', () => {
      expect(isPrivateIPv4('8.8.8.8')).toBe(false);
      expect(isPrivateIPv4('93.184.216.34')).toBe(false);
      expect(isPrivateIPv4('1.1.1.1')).toBe(false);
    });
  });

  describe('isPrivateIPv6', () => {
    it('detects IPv6 loopback and unique local', () => {
      expect(isPrivateIPv6('::1')).toBe(true);
      expect(isPrivateIPv6('fc00::1')).toBe(true);
      expect(isPrivateIPv6('fd12:3456:789a::1')).toBe(true);
      expect(isPrivateIPv6('fe80::1')).toBe(true);
    });

    it('detects IPv4-mapped IPv6 private addresses', () => {
      expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIPv6('::ffff:169.254.169.254')).toBe(true);
      expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true);
    });

    it('allows public IPv6 addresses', () => {
      expect(isPrivateIPv6('2607:f8b0:4005:805::200e')).toBe(false);
      expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false);
    });
  });

  describe('isPrivateOrUnsafeIP', () => {
    it('correctly dispatches both IPv4 and IPv6', () => {
      expect(isPrivateOrUnsafeIP('127.0.0.1')).toBe(true);
      expect(isPrivateOrUnsafeIP('::1')).toBe(true);
      expect(isPrivateOrUnsafeIP('8.8.8.8')).toBe(false);
      expect(isPrivateOrUnsafeIP('invalid-ip')).toBe(true);
    });
  });

  describe('validateDestinationUrl', () => {
    it('rejects non-http/https protocols', async () => {
      await expect(validateDestinationUrl('ftp://example.com/webhook')).rejects.toThrow(
        'Unsupported URL protocol'
      );
      await expect(validateDestinationUrl('file:///etc/passwd')).rejects.toThrow(
        'Unsupported URL protocol'
      );
    });

    it('rejects URLs with embedded credentials', async () => {
      await expect(
        validateDestinationUrl('https://admin:secret@example.com/webhook')
      ).rejects.toThrow('embedded user credentials');
    });

    it('rejects localhost and cloud internal hostnames', async () => {
      await expect(validateDestinationUrl('http://localhost:3000')).rejects.toThrow(
        'Forbidden destination hostname'
      );
      await expect(
        validateDestinationUrl('http://metadata.google.internal/computeMetadata/v1/')
      ).rejects.toThrow('Forbidden destination hostname');
      await expect(validateDestinationUrl('http://service.local/webhook')).rejects.toThrow(
        'Forbidden destination hostname'
      );
    });

    it('rejects direct private IPs in URL', async () => {
      await expect(
        validateDestinationUrl('http://169.254.169.254/latest/meta-data/')
      ).rejects.toThrow('Forbidden destination IP address');
      await expect(validateDestinationUrl('http://127.0.0.1:8080/hook')).rejects.toThrow(
        'Forbidden destination IP address'
      );
    });

    it('rejects hostnames resolving to private IP via DNS', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
        { address: '127.0.0.1', family: 4 },
      ] as any);

      await expect(
        validateDestinationUrl('https://evil-internal-rebinder.com/webhook')
      ).rejects.toThrow('SSRF Protection');
    });

    it('allows valid public domain and returns resolved IP', async () => {
      vi.spyOn(dns.promises, 'lookup').mockResolvedValueOnce([
        { address: '93.184.216.34', family: 4 },
      ] as any);

      const result = await validateDestinationUrl('https://example.com/webhook');
      expect(result.resolvedIp).toBe('93.184.216.34');
      expect(result.isIpv6).toBe(false);
      expect(result.parsedUrl.hostname).toBe('example.com');
    });
  });
});
