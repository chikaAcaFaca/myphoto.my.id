'use client';

import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../stores';
import { formatBytes, formatStoragePercentage } from '@myphoto/shared';

export function useStorage() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['storage', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const userRef = doc(db, 'users', user.id);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data();
      const used = userData.storageUsed || 0;
      const limit = userData.storageLimit || 0;
      const ratio = limit > 0 ? used / limit : 0;

      return {
        used,
        limit,
        usedFormatted: formatBytes(used),
        limitFormatted: formatBytes(limit),
        percentage: formatStoragePercentage(used, limit),
        remaining: Math.max(0, limit - used),
        remainingFormatted: formatBytes(Math.max(0, limit - used)),
        isNearLimit: ratio > 0.9,
        isAt80: ratio >= 0.8 && ratio < 0.95,
        isAt95: ratio >= 0.95 && ratio < 1.0,
        isAtLimit: used >= limit,
      };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}
