'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getIdToken } from '../firebase';
import { tStatic } from '@/components/i18n-static';
import { useAuthStore } from '../stores';

export function useClaimBackupBonus() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (platform: 'android' | 'ios' = 'android') => {
      const token = await getIdToken();
      if (!token) throw new Error(tStatic('components.errors.notAuthenticated'));

      const res = await fetch('/api/bonus/backup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tStatic('components.errors.claimBonusFailed'));
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      useAuthStore.getState().refreshUser();
    },
  });
}
