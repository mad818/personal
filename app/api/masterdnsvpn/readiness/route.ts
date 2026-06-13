import net from "node:net";
import {
  buildMasterDnsVpnReadiness,
  isLoopbackMasterDnsVpnHost,
  normalizeMasterDnsVpnEncryption,
  type MasterDnsVpnConfigPosture,
} from "@/lib/masterDnsVpn";
import { protectedJson } from "@/lib/protectedApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function envBoolean(name: string) {
  return process.env[name]?.trim().toLowerCase() === "true";
}

function envInteger(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isInteger(value) ? value : fallback;
}

function readConfig(): MasterDnsVpnConfigPosture {
  return {
    authorized: envBoolean("NEXUS_MASTERDNSVPN_AUTHORIZED"),
    delegatedDomainConfigured: envBoolean(
      "NEXUS_MASTERDNSVPN_DELEGATED_DOMAIN_CONFIGURED",
    ),
    resolverCount: envInteger("NEXUS_MASTERDNSVPN_RESOLVER_COUNT", 0),
    encryption: normalizeMasterDnsVpnEncryption(
      process.env.NEXUS_MASTERDNSVPN_ENCRYPTION,
    ),
    proxyHost: process.env.NEXUS_MASTERDNSVPN_PROXY_HOST?.trim() || "127.0.0.1",
    proxyPort: envInteger("NEXUS_MASTERDNSVPN_PROXY_PORT", 1080),
    localDnsEnabled: envBoolean("NEXUS_MASTERDNSVPN_LOCAL_DNS_ENABLED"),
    cacheEnabled: envBoolean("NEXUS_MASTERDNSVPN_CACHE_ENABLED"),
    compressionEnabled: envBoolean("NEXUS_MASTERDNSVPN_COMPRESSION_ENABLED"),
    requestPackingEnabled: envBoolean(
      "NEXUS_MASTERDNSVPN_REQUEST_PACKING_ENABLED",
    ),
    externalSocksConfigured: envBoolean(
      "NEXUS_MASTERDNSVPN_EXTERNAL_SOCKS_CONFIGURED",
    ),
  };
}

async function probeLoopbackListener(host: string, port: number) {
  if (!isLoopbackMasterDnsVpnHost(host)) return false;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return false;

  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (reachable: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(800);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function GET() {
  try {
    const config = readConfig();
    const listenerReachable =
      config.authorized && isLoopbackMasterDnsVpnHost(config.proxyHost)
        ? await probeLoopbackListener(config.proxyHost, config.proxyPort)
        : false;
    const readiness = buildMasterDnsVpnReadiness(config, listenerReachable);

    return protectedJson({
      readiness,
      configuration: {
        authorized: config.authorized,
        delegatedDomainConfigured: config.delegatedDomainConfigured,
        resolverCount: config.resolverCount,
        encryption: config.encryption,
        proxyHost: isLoopbackMasterDnsVpnHost(config.proxyHost)
          ? "loopback"
          : "blocked-non-loopback",
        proxyPortConfigured: Number.isInteger(config.proxyPort),
        localDnsEnabled: config.localDnsEnabled,
        cacheEnabled: config.cacheEnabled,
        compressionEnabled: config.compressionEnabled,
        requestPackingEnabled: config.requestPackingEnabled,
        externalSocksConfigured: config.externalSocksConfigured,
      },
    });
  } catch {
    return protectedJson(
      { error: "Unable to inspect MasterDnsVPN readiness." },
      { status: 500 },
    );
  }
}
