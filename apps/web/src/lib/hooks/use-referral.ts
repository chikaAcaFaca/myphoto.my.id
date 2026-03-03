'use client';

import { useQuery } from '@tanstack/react-query';
import { getIdToken } from '../firebase';
import { useAuthStore } from '../stores';

export interface ReferralStats {
  referralCode: string;
  referralCount: number;
  maxReferrals: number;
  bonusBytes: number;
  bonusFormatted: string;
  maxBonusFormatted: string;
  referralLink: string;
  referrals: { email: string; date: string }[];
}

export function useReferralStats() {
  const user = useAuthStore((state) => state.user);

  return useQuery<ReferralStats>({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/referral/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch referral stats');
      return res.json();
    },
    enabled: !!user,
  });
}
