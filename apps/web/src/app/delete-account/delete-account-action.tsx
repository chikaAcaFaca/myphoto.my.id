'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { DeleteAccountDialog } from '@/components/settings/delete-account-dialog';
import { useT } from '@/i18n/client';

export function DeleteAccountAction() {
  const { firebaseUser, isLoading } = useAuthStore();
  const [open, setOpen] = useState(false);
  const t = useT();

  if (isLoading) return null;

  if (!firebaseUser) {
    return (
      <Link
        href="/login?redirect=/delete-account"
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
      >
        <Trash2 className="h-4 w-4" />
        {t('pages.deleteAccount.signInToDelete')}
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
      >
        <Trash2 className="h-4 w-4" />
        {t('pages.deleteAccount.deleteButton')} {firebaseUser.email ? `(${firebaseUser.email})` : ''}
      </button>
      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </>
  );
}
