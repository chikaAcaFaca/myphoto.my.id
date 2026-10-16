'use client';

import { useMutation } from '@tanstack/react-query';
import { getIdToken } from '../firebase';
import { tStatic } from '@/components/i18n-static';

export function useShareFile() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      const token = await getIdToken();
      if (!token) throw new Error(tStatic('components.errors.notAuthenticated'));

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tStatic('components.errors.createShareFailed'));
      }

      return (await res.json()) as { shareUrl: string; token: string };
    },
  });
}

export function useShareAlbum() {
  return useMutation({
    mutationFn: async ({ albumId, permission = 'read' }: { albumId: string; permission?: 'read' | 'readwrite' }) => {
      const token = await getIdToken();
      if (!token) throw new Error(tStatic('components.errors.notAuthenticated'));

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ albumId, permission }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tStatic('components.errors.createShareFailed'));
      }

      return (await res.json()) as { shareUrl: string; token: string };
    },
  });
}

export function useRevokeShare() {
  return useMutation({
    mutationFn: async (shareToken: string) => {
      const token = await getIdToken();
      if (!token) throw new Error(tStatic('components.errors.notAuthenticated'));

      const res = await fetch('/api/share', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: shareToken }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || tStatic('components.errors.revokeShareFailed'));
      }

      return (await res.json()) as { success: boolean };
    },
  });
}
