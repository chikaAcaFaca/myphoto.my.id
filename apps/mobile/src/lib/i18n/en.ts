// English — the source of truth. Every other language is typed against
// this shape, so a key missing from sr.ts is a compile error.
import common from './en/common';
import nav from './en/nav';
import auth from './en/auth';
import onboarding from './en/onboarding';
import account from './en/account';
import pricing from './en/pricing';
import settings from './en/settings';
import devices from './en/devices';
import notifications from './en/notifications';
import home from './en/home';
import upload from './en/upload';
import myspace from './en/myspace';
import albums from './en/albums';
import videos from './en/videos';
import search from './en/search';
import archive from './en/archive';
import trash from './en/trash';
import duplicates from './en/duplicates';
import viewer from './en/viewer';
import editor from './en/editor';
import people from './en/people';
import memories from './en/memories';
import family from './en/family';
import creative from './en/creative';
import aiCaption from './en/aiCaption';
import meme from './en/meme';
import sticker from './en/sticker';
import comic from './en/comic';
import sync from './en/sync';
import storage from './en/storage';
import cloudGate from './en/cloudGate';
import appUpdate from './en/appUpdate';
import shareIntent from './en/shareIntent';
import libs from './en/libs';
import inbox from './en/inbox';
import messages from './en/messages';

export const en = {
  common,
  nav,
  auth,
  onboarding,
  account,
  pricing,
  settings,
  devices,
  notifications,
  home,
  upload,
  myspace,
  albums,
  videos,
  search,
  archive,
  trash,
  duplicates,
  viewer,
  editor,
  people,
  memories,
  family,
  creative,
  aiCaption,
  meme,
  sticker,
  comic,
  sync,
  storage,
  cloudGate,
  appUpdate,
  shareIntent,
  libs,
  inbox,
  messages,
};

export type Dictionary = typeof en;
export default en;
