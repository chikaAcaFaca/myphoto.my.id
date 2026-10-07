import type { pages as En } from '../en/pages';
import type { DeepStrings } from '../types';
import { privacy } from './pages-privacy';
import { terms } from './pages-terms';
import { shared } from './pages-shared';
import { checkout, pricing } from './pages-billing';
import { auth } from './pages-auth';
import { shell, contact, support, deleteAccount, desktopAuth, meme, user } from './pages-misc';

export const pages: DeepStrings<typeof En> = {
  privacy,
  terms,
  shared,
  checkout,
  pricing,
  auth,
  shell,
  contact,
  support,
  deleteAccount,
  desktopAuth,
  meme,
  user,
};
