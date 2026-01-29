'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';
import Image from 'next/image';

interface DuplicateFile {
  id: string;
  name: string;
  size: number;
  thumbnailKey: string;
  createdAt: Date;
}

interface DuplicateGroup {
  files: DuplicateFile[];
  similarity: number;
}

export default function DuplicatesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['duplicates', user?.id],
    queryFn: async () => {
      const token = await getIdToken();
      const response = await fetch('/api/duplicates', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch duplicates');
      }

      const data = await response.json();
      return data.duplicates as DuplicateGroup[];
    },
    enabled: !!user,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      fileId,
      action,
    }: {
      fileId: string;
      action: 'dismiss' | 'delete';
    }) => {
      const token = await getIdToken();
      const response = await fetch('/api/duplicates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, action }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
    },
  });

  const duplicates = data || [];

  const toggleGroup = (index: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Duplicate Photos</h1>
        <p className="text-gray-500">
          Found {duplicates.length} groups of similar photos
        </p>
      </div>

      {duplicates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-green-50 p-6 dark:bg-green-900/20">
            <Check className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold">No duplicates found</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Your photo library is clean! We couldn't find any duplicate or
            similar photos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group, groupIndex) => (
            <motion.div
              key={groupIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(groupIndex)}
                className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {group.files.slice(0, 3).map((file, i) => (
                      <div
                        key={file.id}
                        className="relative h-12 w-12 overflow-hidden rounded-lg border-2 border-white dark:border-gray-800"
                        style={{ zIndex: 3 - i }}
                      >
                        <Image
                          src={`/api/thumbnail/${file.id}`}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {group.files.length > 3 && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-white bg-gray-100 text-sm font-medium dark:border-gray-800 dark:bg-gray-700">
                        +{group.files.length - 3}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {group.files.length} similar photos
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.round(group.similarity * 100)}% similar
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Copy className="h-4 w-4" />
                  {expandedGroups.has(groupIndex) ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedGroups.has(groupIndex) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {group.files.map((file, fileIndex) => (
                          <div
                            key={file.id}
                            className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            {/* Thumbnail */}
                            <div className="relative aspect-square">
                              <Image
                                src={`/api/thumbnail/${file.id}`}
                                alt={file.name}
                                fill
                                className="object-cover"
                              />
                              {fileIndex === 0 && (
                                <div className="absolute left-2 top-2 rounded-full bg-primary-500 px-2 py-0.5 text-xs font-medium text-white">
                                  Keep
                                </div>
                              )}
                            </div>

                            {/* File Info */}
                            <div className="p-2">
                              <div
                                className="truncate text-sm font-medium"
                                title={file.name}
                              >
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(file.size)} &middot;{' '}
                                {formatDate(file.createdAt)}
                              </div>
                            </div>

                            {/* Actions (show on hover, except for first/kept file) */}
                            {fileIndex > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() =>
                                    actionMutation.mutate({
                                      fileId: file.id,
                                      action: 'dismiss',
                                    })
                                  }
                                  className="rounded-full bg-white p-2 text-gray-700 hover:bg-gray-100"
                                  title="Not a duplicate"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() =>
                                    actionMutation.mutate({
                                      fileId: file.id,
                                      action: 'delete',
                                    })
                                  }
                                  className="rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                                  title="Move to trash"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            group.files.slice(1).forEach((file) => {
                              actionMutation.mutate({
                                fileId: file.id,
                                action: 'dismiss',
                              });
                            });
                          }}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                          Dismiss All
                        </button>
                        <button
                          onClick={() => {
                            group.files.slice(1).forEach((file) => {
                              actionMutation.mutate({
                                fileId: file.id,
                                action: 'delete',
                              });
                            });
                          }}
                          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                        >
                          Delete Duplicates
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Potential savings</div>
              <div className="text-sm text-gray-500">
                {duplicates.reduce((sum, g) => sum + g.files.length - 1, 0)}{' '}
                duplicate photos found
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">
                {formatFileSize(
                  duplicates.reduce(
                    (sum, g) =>
                      sum +
                      g.files.slice(1).reduce((s, f) => s + f.size, 0),
                    0
                  )
                )}
              </div>
              <div className="text-sm text-gray-500">can be freed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
