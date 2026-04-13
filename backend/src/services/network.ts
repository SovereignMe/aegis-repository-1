type RequestLike = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

export function normalizeIp(rawIp?: string) {
  const ip = String(rawIp || "").trim();
  if (!ip) return "";
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function parseIpv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts;
}

function ipv4ToInt(ip: string) {
  const parts = parseIpv4(ip);
  if (!parts) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function cidrMatch(ip: string, cidr: string) {
  const [network, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw || "32");
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  if (ipInt == null || networkInt == null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : ((0xffffffff << (32 - bits)) >>> 0);
  return (ipInt & mask) === (networkInt & mask);
}

export function isPrivateNetworkIp(rawIp?: string) {
  const ip = normalizeIp(rawIp);
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "::1" || ip.toLowerCase() === "localhost") return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  const match172 = ip.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
}

export function isTrustedProxyIp(rawIp: string | undefined, rules: string[]) {
  const ip = normalizeIp(rawIp);
  if (!ip) return false;
  return rules.some((rule) => {
    const normalized = String(rule || "").trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === "loopback") return ip === "127.0.0.1" || ip === "::1" || ip.toLowerCase() === "localhost";
    if (normalized === "private") return isPrivateNetworkIp(ip);
    if (normalized.includes("/")) return cidrMatch(ip, normalized);
    return ip === normalizeIp(normalized);
  });
}

export function resolveClientIp(request: RequestLike, trustProxy: boolean, trustedProxyRules: string[]) {
  const directIp = normalizeIp(request.ip || request.socket?.remoteAddress);
  if (!trustProxy) return directIp;
  if (!isTrustedProxyIp(directIp, trustedProxyRules)) return directIp;
  const xForwardedFor = request.headers?.["x-forwarded-for"];
  const forwardedValue = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
  const forwardedClient = normalizeIp(String(forwardedValue || "").split(",")[0]?.trim());
  return forwardedClient || directIp;
}
