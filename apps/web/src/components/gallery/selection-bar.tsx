'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, RefreshCw } from 'lucide-react';
import { useFilesStore } from '@/lib/stores';

interface SelectionBarAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'danger' | 'default';
}

interface SelectionBarProps {
  actions?: SelectionBarAction[];
}

export function SelectionBar({ actions }: SelectionBarProps) {
  const { selectedFiles, deselectAll } = useFilesStore();
  const count = selectedFiles.size;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {count} izabrano
            </span>

            <div className="h-5 w-px bg-gray-200 dark:bg-gray-600" />

            {actions?.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={
                  action.variant === 'danger'
                    ? 'flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors'
                    : 'flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors'
                }
              >
                {action.icon}
                {action.label}
              </button>
            ))}

            <button
              onClick={deselectAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
              Ponisti
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
