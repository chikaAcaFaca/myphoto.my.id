import type { common as En } from '../en/common';
import type { DeepStrings } from '../types';

export const common: DeepStrings<typeof En> = {
  periods: {
    monthly: 'Mesečno',
    quarterly: '3 meseca',
    semiannual: '6 meseci',
    yearly: 'Godišnje',
  },
  periodsShort: {
    monthly: 'mes',
    quarterly: '3 mes',
    semiannual: '6 mes',
    yearly: 'god',
  },
};
