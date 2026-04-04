import * as SQLite from 'expo-sqlite';

export interface PhotoIndexEntry {
  assetId: string;
  labels: string;
  sceneType: string;
  faceCount: number;
  isScreenshot: boolean;
  ocrText: string;
  qualityScore: number;
  createdAt: number;
  syncedToCloud: boolean;
  cloudFileId: string | null;
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('myphoto_ai_index');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS photo_index (
        asset_id TEXT PRIMARY KEY,
        labels TEXT DEFAULT '',
        scene_type TEXT DEFAULT 'other',
        face_count INTEGER DEFAULT 0,
        is_screenshot INTEGER DEFAULT 0,
        ocr_text TEXT DEFAULT '',
        quality_score REAL DEFAULT 0,
        created_at INTEGER DEFAULT 0,
        synced_to_cloud INTEGER DEFAULT 0,
        cloud_file_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_labels ON photo_index(labels);
      CREATE INDEX IF NOT EXISTS idx_scene ON photo_index(scene_type);
      CREATE INDEX IF NOT EXISTS idx_synced ON photo_index(synced_to_cloud);
    `);
  }
  return db;
}

/**
 * Insert or update a photo in the local index.
 */
export async function upsertLocalPhoto(entry: PhotoIndexEntry): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO photo_index
     (asset_id, labels, scene_type, face_count, is_screenshot, ocr_text, quality_score, created_at, synced_to_cloud, cloud_file_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.assetId,
    entry.labels,
    entry.sceneType,
    entry.faceCount,
    entry.isScreenshot ? 1 : 0,
    entry.ocrText || '',
    entry.qualityScore || 0,
    entry.createdAt,
    entry.syncedToCloud ? 1 : 0,
    entry.cloudFileId
  );
}

/**
 * Search local photos by query string.
 * Matches against labels and scene type.
 */
export async function searchLocalPhotos(query: string): Promise<PhotoIndexEntry[]> {
  const database = await getDb();
  const pattern = `%${query.toLowerCase()}%`;
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM photo_index
     WHERE LOWER(labels) LIKE ? OR LOWER(scene_type) LIKE ? OR LOWER(ocr_text) LIKE ?
     ORDER BY created_at DESC
     LIMIT 100`,
    pattern,
    pattern,
    pattern
  );
  return rows.map(mapRow);
}

/**
 * Mark a local photo as synced to cloud.
 */
export async function markAsSynced(assetId: string, cloudFileId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE photo_index SET synced_to_cloud = 1, cloud_file_id = ? WHERE asset_id = ?`,
    cloudFileId,
    assetId
  );
}

/**
 * Check if an asset is already indexed.
 */
export async function isIndexed(assetId: string): Promise<boolean> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM photo_index WHERE asset_id = ?`,
    assetId
  );
  return (row?.count || 0) > 0;
}

/**
 * Get count of unindexed assets.
 */
export async function getIndexedCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM photo_index`
  );
  return row?.count || 0;
}

/**
 * Get photos by scene type.
 */
export async function getPhotosByScene(sceneType: string): Promise<PhotoIndexEntry[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM photo_index WHERE scene_type = ? ORDER BY created_at DESC LIMIT 100`,
    sceneType
  );
  return rows.map(mapRow);
}

/**
 * Get all scene types with counts.
 */
export async function getSceneCounts(): Promise<{ sceneType: string; count: number }[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ scene_type: string; count: number }>(
    `SELECT scene_type, COUNT(*) as count FROM photo_index GROUP BY scene_type ORDER BY count DESC`
  );
  return rows.map((r) => ({ sceneType: r.scene_type, count: r.count }));
}

function mapRow(row: any): PhotoIndexEntry {
  return {
    assetId: row.asset_id,
    labels: row.labels,
    sceneType: row.scene_type,
    faceCount: row.face_count,
    isScreenshot: row.is_screenshot === 1,
    ocrText: row.ocr_text || '',
    qualityScore: row.quality_score || 0,
    createdAt: row.created_at,
    syncedToCloud: row.synced_to_cloud === 1,
    cloudFileId: row.cloud_file_id,
  };
}
