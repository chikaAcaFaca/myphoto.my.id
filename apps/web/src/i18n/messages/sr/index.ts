import type { Messages } from '../en';
import type { DeepStrings } from '../types';
import { common } from './common';
import { marketing } from './marketing';
import { dashboard } from './dashboard';
import { components } from './components';
import { pages } from './pages';
import { myspace } from './myspace';

export const sr: DeepStrings<Messages> = { common, marketing, dashboard, components, pages, myspace };
