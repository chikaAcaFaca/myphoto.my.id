'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Check, X, Play, Image as ImageIcon, Eye } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface DuplicateFile {
  id: string;
  name: string;
  size: number;
  type: string;
  thumbnailKey: string;
  createdAt: Date;
  duration?: number;
}

interface DuplicateGroup {
  files: DuplicateFile[];
  similarity: number;
  matchType: string;
}

export default function DuplicatesPage() {
  const { user } = useAuthStore();
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['duplicates', user?.id],
    queryFn: async () => {
      const token = await getIdToken();
      const response = await fetch('/api/duplicates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch duplicates');
      const data = await response.json();
      return data.duplicates as DuplicateGroup[];
    },
    enabled: !!user,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ fileId, action }: { fileId: string; action: 'dismiss' | 'delete' }) => {
      const token = await getIdToken();
      const response = await fetch('/api/duplicates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, action }),
      });
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const handleDeleteDuplicates = (group: DuplicateGroup) => {
    // Keep the first (oldest), delete the rest
    const toDelete = group.files.slice(1);
    for (const file of toDelete) {
      actionMutation.mutate({ fileId: file.id, action: 'delete' });
    }
    addNotification({
      type: 'success',
      title: 'Duplikati obrisani',
      message: `${toDelete.length} fajlova premesteno u korpu`,
    });
  };

  const duplicates = data || [];

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('sr-Latn', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const matchLabel = (type: string) => {
    switch (type) {
      case 'visual': return 'Vizuelno slični';
      case 'size': return 'Ista veličina';
      case 'name': return 'Sličan naziv';
      default: return 'Duplikat';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Duplikati</h1>
        <p className="text-gray-500">
          {duplicates.length === 0
            ? 'Nema duplikata u vašoj galeriji'
            : `Pronađeno ${duplicates.length} grupa sličnih fajlova`}
        </p>
      </div>

      {duplicates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-green-50 p-6 dark:bg-green-900/20">
            <Check className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold">Nema duplikata</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Vaša galerija je čista! Nismo pronašli duplikate ili slične fajlove.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group, gi) => (
            <motion.div
              key={gi}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Always show side-by-side comparison */}
              <div className="p-4">
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      group.matchType === 'visual' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      group.matchType === 'size' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    )}>
                      {matchLabel(group.matchType)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(group.similarity)}% sličnost &middot; {group.files.length} fajla
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        group.files.slice(1).forEach((f) =>
                          actionMutation.mutate({ fileId: f.id, action: 'dismiss' })
                        );
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      Zadrži sve
                    </button>
                    <button
                      onClick={() => handleDeleteDuplicates(group)}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                    >
                      <Trash2 className="mr-1 inline h-3 w-3" />
                      Obriši duplikate
                    </button>
                  </div>
                </div>

                {/* Side-by-side file comparison */}
                <div className={cn(
                  'grid gap-3',
                  group.files.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                )}>
                  {group.files.map((file, fi) => (
                    <DuplicateCard
                      key={file.id}
                      file={file}
                      isOriginal={fi === 0}
                      onDelete={() => actionMutation.mutate({ fileId: file.id, action: 'delete' })}
                      onDismiss={() => actionMutation.mutate({ fileId: file.id, action: 'dismiss' })}
                      formatSize={formatSize}
                      formatDate={formatDate}
                      formatDuration={formatDuration}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Moguća ušteda</div>
              <div className="text-sm text-gray-500">
                {duplicates.reduce((sum, g) => sum + g.files.length - 1, 0)} duplikata pronađeno
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">
                {formatSize(
                  duplicates.reduce(
                    (sum, g) => sum + g.files.slice(1).reduce((s, f) => s + f.size, 0),
                    0
                  )
                )}
              </div>
              <div className="text-sm text-gray-500">može se osloboditi</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DuplicateCard({
  file,
  isOriginal,
  onDelete,
  onDismiss,
  formatSize,
  formatDate,
  formatDuration,
}: {
  file: DuplicateFile;
  isOriginal: boolean;
  onDelete: () => void;
  onDismiss: () => void;
  formatSize: (n: number) => string;
  formatDate: (d: Date | string) => string;
  formatDuration: (n: number) => string;
}) {
  const [imgError, setImgError] = useState(false);
  const isVideo = file.type === 'video';

  return (
    <div className={cn(
      'group relative overflow-hidden rounded-lg border',
      isOriginal
        ? 'border-green-300 dark:border-green-700'
        : 'border-gray-200 dark:border-gray-700'
    )}>
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/thumbnail/${file.id}?size=medium`}
            alt={file.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center">
            {isVideo ? (
              <Play className="h-10 w-10 text-gray-400" />
            ) : (
              <ImageIcon className="h-10 w-10 text-gray-400" />
            )}
            <span className="mt-1 max-w-[90%] truncate text-[10px] text-gray-400">{file.name}</span>
          </div>
        )}

        {/* Badge */}
        {isOriginal && (
          <div className="absolute left-2 top-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            ORIGINAL
          </div>
        )}

        {/* Video duration */}
        {isVideo && file.duration && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
            <Play className="h-2.5 w-2.5" />
            {formatDuration(file.duration)}
          </div>
        )}

        {/* Action overlay (non-original files) */}
        {!isOriginal && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="rounded-full bg-white p-2 text-gray-700 shadow hover:bg-gray-100"
              title="Zadrži"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="rounded-full bg-red-500 p-2 text-white shadow hover:bg-red-600"
              title="Obriši"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="p-2">
        <div className="truncate text-xs font-medium" title={file.name}>
          {file.name}
        </div>
        <div className="mt-0.5 text-[10px] text-gray-500">
          {formatSize(file.size)} &middot; {formatDate(file.createdAt)}
        </div>
      </div>
    </div>
  );
}
