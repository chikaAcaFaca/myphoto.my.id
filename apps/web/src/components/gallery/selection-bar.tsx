'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useFilesStore } from '@/lib/stores';

interface SelectionBarAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'danger' | 'primary' | 'default';
  disabled?: boolean;
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
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:gap-3 sm:px-5 sm:py-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {count} izabrano
            </span>

            <div className="h-5 w-px bg-gray-200 dark:bg-gray-600" />

            {actions?.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                disabled={action.disabled}
                className={
                  action.variant === 'danger'
                    ? 'flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50'
                    : action.variant === 'primary'
                      ? 'flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-50'
                      : 'flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50'
                }
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}

            <button
              onClick={deselectAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Poništi</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
