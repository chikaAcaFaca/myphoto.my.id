import { db } from '../firebase-admin';
import type { FileMetadata, Memory } from '@myphoto/shared';

// ============================================
// ON THIS DAY - Memories from past years
// ============================================

export async function generateOnThisDayMemories(
  userId: string
): Promise<Memory[]> {
  const today = new Date();
  const memories: Memory[] = [];

  // Check for each year going back 10 years
  for (let yearsAgo = 1; yearsAgo <= 10; yearsAgo++) {
    const targetDate = new Date(today);
    targetDate.setFullYear(today.getFullYear() - yearsAgo);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query files from that day
    const snapshot = await db
      .collection('files')
      .where('userId', '==', userId)
      .where('isTrashed', '==', false)
      .where('takenAt', '>=', startOfDay)
      .where('takenAt', '<=', endOfDay)
      .orderBy('takenAt', 'asc')
      .limit(20)
      .get();

    if (snapshot.size >= 3) {
      // Minimum 3 photos for a memory
      const files = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FileMetadata[];

      // Select best cover photo (highest quality score or with faces)
      const coverFile = selectBestCoverPhoto(files);

      memories.push({
        id: `otd-${yearsAgo}-${today.toISOString().split('T')[0]}`,
        title: `${yearsAgo} ${yearsAgo === 1 ? 'year' : 'years'} ago`,
        description: formatMemoryDescription(files, targetDate),
        files,
        date: targetDate,
        type: 'on_this_day',
      });
    }
  }

  return memories;
}

// ============================================
// TRIP DETECTION - Cluster by location & time
// ============================================

interface LocationCluster {
  centroid: { lat: number; lng: number };
  files: FileMetadata[];
  startDate: Date;
  endDate: Date;
  locationName?: string;
}

export async function detectTrips(userId: string): Promise<Memory[]> {
  // Get files with location data from past year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const snapshot = await db
    .collection('files')
    .where('userId', '==', userId)
    .where('isTrashed', '==', false)
    .where('takenAt', '>=', oneYearAgo)
    .orderBy('takenAt', 'asc')
    .get();

  const filesWithLocation = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as FileMetadata))
    .filter((f) => f.location?.latitude && f.location?.longitude);

  if (filesWithLocation.length < 5) return [];

  // Cluster by location and time
  const clusters = clusterByLocationAndTime(filesWithLocation, {
    maxDistanceKm: 50,
    maxTimeDiffHours: 48,
    minPhotos: 5,
  });

  // Convert clusters to memories
  return clusters.map((cluster, index) => ({
    id: `trip-${cluster.startDate.toISOString()}`,
    title: cluster.locationName || `Trip ${index + 1}`,
    description: `${cluster.files.length} photos from ${formatDateRange(
      cluster.startDate,
      cluster.endDate
    )}`,
    files: cluster.files,
    date: cluster.startDate,
    type: 'trip' as const,
  }));
}

function clusterByLocationAndTime(
  files: FileMetadata[],
  options: {
    maxDistanceKm: number;
    maxTimeDiffHours: number;
    minPhotos: number;
  }
): LocationCluster[] {
  const clusters: LocationCluster[] = [];

  for (const file of files) {
    if (!file.location) continue;

    // Find matching cluster
    let matchedCluster: LocationCluster | null = null;

    for (const cluster of clusters) {
      const distance = haversineDistance(
        cluster.centroid,
        file.location
      );

      const timeDiff =
        Math.abs(
          (file.takenAt?.getTime() || file.createdAt.getTime()) -
            cluster.endDate.getTime()
        ) /
        (1000 * 60 * 60);

      if (
        distance <= options.maxDistanceKm &&
        timeDiff <= options.maxTimeDiffHours
      ) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      // Add to existing cluster
      matchedCluster.files.push(file);
      matchedCluster.endDate = file.takenAt || file.createdAt;
      // Update centroid
      matchedCluster.centroid = {
        lat:
          matchedCluster.files.reduce(
            (sum, f) => sum + (f.location?.latitude || 0),
            0
          ) / matchedCluster.files.length,
        lng:
          matchedCluster.files.reduce(
            (sum, f) => sum + (f.location?.longitude || 0),
            0
          ) / matchedCluster.files.length,
      };
    } else {
      // Create new cluster
      clusters.push({
        centroid: {
          lat: file.location.latitude,
          lng: file.location.longitude,
        },
        files: [file],
        startDate: file.takenAt || file.createdAt,
        endDate: file.takenAt || file.createdAt,
      });
    }
  }

  // Filter clusters with minimum photos
  return clusters.filter((c) => c.files.length >= options.minPhotos);
}

function haversineDistance(
  coord1: { lat: number; lng: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.lat);
  const dLon = toRad(coord2.longitude - coord1.lng);
  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ============================================
// PEOPLE MEMORIES - Group by detected faces
// ============================================

export async function generatePeopleMemories(userId: string): Promise<Memory[]> {
  // Get named people with sufficient photos
  const peopleSnapshot = await db
    .collection('people')
    .where('userId', '==', userId)
    .where('photoCount', '>=', 10)
    .orderBy('photoCount', 'desc')
    .limit(10)
    .get();

  const memories: Memory[] = [];

  for (const personDoc of peopleSnapshot.docs) {
    const person = personDoc.data();

    if (!person.name) continue; // Only include named people

    // Get files for this person
    const filesSnapshot = await db
      .collection('files')
      .where('userId', '==', userId)
      .where('isTrashed', '==', false)
      .where('faces', 'array-contains', personDoc.id)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const files = filesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FileMetadata[];

    if (files.length >= 5) {
      memories.push({
        id: `person-${personDoc.id}`,
        title: person.name,
        description: `${person.photoCount} photos`,
        files,
        date: new Date(),
        type: 'collection',
      });
    }
  }

  return memories;
}

// ============================================
// BEST OF PERIOD - Top photos from a period
// ============================================

export async function generateBestOfMemory(
  userId: string,
  period: 'month' | 'year'
): Promise<Memory | null> {
  const now = new Date();
  const startDate =
    period === 'month'
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
      : new Date(now.getFullYear() - 1, 0, 1);

  const endDate =
    period === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 0)
      : new Date(now.getFullYear() - 1, 11, 31);

  // Get photos from the period, prioritizing favorites and those with faces
  const snapshot = await db
    .collection('files')
    .where('userId', '==', userId)
    .where('isTrashed', '==', false)
    .where('type', '==', 'image')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  if (snapshot.size < 5) return null;

  const files = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FileMetadata[];

  // Score and sort photos
  const scored = files.map((file) => ({
    file,
    score: calculatePhotoScore(file),
  }));

  scored.sort((a, b) => b.score - a.score);

  const topFiles = scored.slice(0, 20).map((s) => s.file);

  const periodName = period === 'month'
    ? startDate.toLocaleString('en', { month: 'long', year: 'numeric' })
    : startDate.getFullYear().toString();

  return {
    id: `best-${period}-${startDate.toISOString()}`,
    title: `Best of ${periodName}`,
    description: `Your top ${topFiles.length} moments`,
    files: topFiles,
    date: startDate,
    type: 'best_of_month',
  };
}

function calculatePhotoScore(file: FileMetadata): number {
  let score = 0;

  // Favorites get highest priority
  if (file.isFavorite) score += 100;

  // Photos with faces
  if (file.faces && file.faces.length > 0) {
    score += file.faces.length * 20;
  }

  // Quality score
  if (file.qualityScore) {
    score += file.qualityScore / 2;
  }

  // Photos with location
  if (file.location) {
    score += 10;
  }

  // Photos with labels (more interesting content)
  if (file.labels && file.labels.length > 0) {
    score += Math.min(file.labels.length * 2, 20);
  }

  return score;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function selectBestCoverPhoto(files: FileMetadata[]): FileMetadata {
  // Sort by score
  const scored = files.map((file) => ({
    file,
    score: calculatePhotoScore(file),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored[0].file;
}

function formatMemoryDescription(files: FileMetadata[], date: Date): string {
  const month = date.toLocaleString('en', { month: 'long' });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${files.length} photos from ${month} ${day}, ${year}`;
}

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en', { ...options, year: 'numeric' });
  }

  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return `${start.toLocaleDateString('en', options)} - ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString('en', options)} - ${end.toLocaleDateString('en', { ...options, year: 'numeric' })}`;
}

// ============================================
// MAIN FUNCTION - Get all memories
// ============================================

export async function getAllMemories(userId: string): Promise<Memory[]> {
  const [onThisDay, trips, people, bestOfMonth, bestOfYear] = await Promise.all([
    generateOnThisDayMemories(userId),
    detectTrips(userId),
    generatePeopleMemories(userId),
    generateBestOfMemory(userId, 'month'),
    generateBestOfMemory(userId, 'year'),
  ]);

  const memories: Memory[] = [
    ...onThisDay,
    ...trips,
    ...people,
  ];

  if (bestOfMonth) memories.push(bestOfMonth);
  if (bestOfYear) memories.push(bestOfYear);

  // Sort by relevance (on_this_day first, then by date)
  return memories.sort((a, b) => {
    if (a.type === 'on_this_day' && b.type !== 'on_this_day') return -1;
    if (b.type === 'on_this_day' && a.type !== 'on_this_day') return 1;
    return b.date.getTime() - a.date.getTime();
  });
}
