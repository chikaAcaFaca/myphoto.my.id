'use client';

import { useEffect } from 'react';
import { storeRef } from '@/lib/referral-link';

/** Remembers ?ref=CODE from whatever page a shared link opened. */
export function RefCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) storeRef(ref);
  }, []);
  return null;
}
