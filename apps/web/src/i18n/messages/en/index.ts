import { common } from './common';
import { marketing } from './marketing';
import { dashboard } from './dashboard';
import { components } from './components';
import { pages } from './pages';
import { myspace } from './myspace';

/** English is the source of truth; every other language is typed against it. */
export const en = { common, marketing, dashboard, components, pages, myspace };
export type Messages = typeof en;
