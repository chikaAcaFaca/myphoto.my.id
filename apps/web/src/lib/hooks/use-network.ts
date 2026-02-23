import { useState, useEffect, useCallback } from 'react';
import type { UserSettings } from '@myphoto/shared';

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'unknown';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: ConnectionType;
  isRoaming: boolean;
  effectiveType?: string;
}

// Extend Navigator for Network Information API (not yet in all TypeScript libs)
interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: EventListener;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

function detectConnectionType(): ConnectionType {
  const conn = getConnection();
  if (!conn?.type) return 'unknown';

  switch (conn.type) {
    case 'wifi':
      return 'wifi';
    case 'cellular':
      return 'cellular';
    case 'ethernet':
      return 'ethernet';
    default:
      return 'unknown';
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
    isRoaming: false,
  });

  useEffect(() => {
    const update = () => {
      const conn = getConnection();
      setStatus({
        isOnline: navigator.onLine,
        connectionType: detectConnectionType(),
        isRoaming: false, // Web API doesn't directly expose roaming; user controls this via settings
        effectiveType: conn?.effectiveType,
      });
    };

    update();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const conn = getConnection();
    if (conn) {
      conn.addEventListener('change', update);
    }

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      if (conn) {
        conn.removeEventListener('change', update);
      }
    };
  }, []);

  return status;
}

export interface UploadPermission {
  allowed: boolean;
  reason?: string;
}

export function useUploadPermission(settings: UserSettings | undefined): UploadPermission {
  const network = useNetworkStatus();

  return useCallback((): UploadPermission => {
    if (!network.isOnline) {
      return { allowed: false, reason: 'Nema internet konekcije' };
    }

    if (!settings) {
      return { allowed: true };
    }

    if (settings.syncMode === 'manual') {
      return { allowed: true }; // Manual mode = user explicitly chose to upload
    }

    if (settings.syncMode === 'wifi_only') {
      if (network.connectionType === 'cellular') {
        return {
          allowed: false,
          reason: 'Upload je ograničen samo na WiFi. Promenite u podešavanjima da dozvolite mobilne podatke.',
        };
      }
    }

    // wifi_and_mobile mode — check roaming
    if (network.connectionType === 'cellular' && !settings.allowRoaming) {
      // We can't detect roaming via Web API, but user can toggle this
      // The roaming check is informational — on web we trust the user's toggle
    }

    return { allowed: true };
  }, [network.isOnline, network.connectionType, settings])();
}
