import { NextRequest, NextResponse } from 'next/server';
import { calculateFolderTotalSize } from '@/lib/shared-folder-quota';
import { resolveDiskShareApiKey, enforceDiskApiKeyRateLimit } from '@/lib/disk-share-api-key';

export const dynamic = 'force-dynamic';

const BYTES_PER_GB = 1024 * 1024 * 1024;
const BYTES_PER_MB = 1024 * 1024;

// GET /api/disk-share/usage — current size of the shared folder tree.
// For automated callers (X-Disk-Api-Key) so they can append a capacity line to
// every report, e.g. "Folder trenutno zauzima 2.41 GB.".
export async function GET(request: NextRequest) {
  try {
    const apiKey = await resolveDiskShareApiKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const limited = await enforceDiskApiKeyRateLimit(apiKey.shareToken);
    if (limited) return limited;

    const usedBytes = await calculateFolderTotalSize(apiKey.folderId, apiKey.ownerId);
    const usedGB = usedBytes / BYTES_PER_GB;
    const usedMB = usedBytes / BYTES_PER_MB;

    return NextResponse.json({
      shareToken: apiKey.shareToken,
      folderId: apiKey.folderId,
      usedBytes,
      usedMB: Number(usedMB.toFixed(2)),
      usedGB: Number(usedGB.toFixed(2)),
      // Ready-to-use one-line report (Serbian) the agent can paste verbatim.
      report:
        usedGB >= 1
          ? `Folder trenutno zauzima ${usedGB.toFixed(2)} GB.`
          : `Folder trenutno zauzima ${usedMB.toFixed(1)} MB.`,
    });
  } catch (error) {
    console.error('Disk share usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
