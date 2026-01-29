'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Users, Star, ChevronRight, X } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';
import type { Memory, FileMetadata } from '@myphoto/shared';
import Image from 'next/image';

export default function MemoriesPage() {
  const { user } = useAuthStore();
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['memories', user?.id],
    queryFn: async () => {
      const token = await getIdToken();
      const response = await fetch('/api/memories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch memories');
      }

      const data = await response.json();
      return data.memories as Memory[];
    },
    enabled: !!user,
  });

  const memories = data || [];

  // Group memories by type
  const onThisDay = memories.filter((m) => m.type === 'on_this_day');
  const trips = memories.filter((m) => m.type === 'trip');
  const people = memories.filter((m) => m.type === 'collection');
  const bestOf = memories.filter((m) => m.type === 'best_of_month');

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Memories</h1>
        <p className="text-gray-500">Rediscover your favorite moments</p>
      </div>

      {/* On This Day */}
      {onThisDay.length > 0 && (
        <MemorySection
          title="On This Day"
          icon={<Clock className="h-5 w-5 text-primary-500" />}
          memories={onThisDay}
          onSelect={setSelectedMemory}
        />
      )}

      {/* Trips */}
      {trips.length > 0 && (
        <MemorySection
          title="Your Trips"
          icon={<MapPin className="h-5 w-5 text-green-500" />}
          memories={trips}
          onSelect={setSelectedMemory}
        />
      )}

      {/* People */}
      {people.length > 0 && (
        <MemorySection
          title="People"
          icon={<Users className="h-5 w-5 text-purple-500" />}
          memories={people}
          onSelect={setSelectedMemory}
        />
      )}

      {/* Best Of */}
      {bestOf.length > 0 && (
        <MemorySection
          title="Highlights"
          icon={<Star className="h-5 w-5 text-yellow-500" />}
          memories={bestOf}
          onSelect={setSelectedMemory}
        />
      )}

      {/* Empty state */}
      {memories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-primary-50 p-6 dark:bg-primary-900/20">
            <Clock className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="text-xl font-semibold">No memories yet</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Keep uploading photos and we'll create personalized memories for you.
            Check back on significant dates!
          </p>
        </div>
      )}

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryModal
            memory={selectedMemory}
            onClose={() => setSelectedMemory(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MemorySection({
  title,
  icon,
  memories,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  memories: Memory[];
  onSelect: (memory: Memory) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} onClick={() => onSelect(memory)} />
        ))}
      </div>
    </section>
  );
}

function MemoryCard({
  memory,
  onClick,
}: {
  memory: Memory;
  onClick: () => void;
}) {
  const coverFile = memory.files[0];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative aspect-video overflow-hidden rounded-xl bg-gray-100 text-left dark:bg-gray-800"
    >
      {coverFile && (
        <Image
          src={`/api/thumbnail/${coverFile.id}`}
          alt={memory.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-semibold text-white">{memory.title}</h3>
        <p className="text-sm text-white/80">{memory.description}</p>
      </div>
      <div className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-1 text-xs text-white">
        {memory.files.length} photos
      </div>
    </motion.button>
  );
}

function MemoryModal({
  memory,
  onClose,
}: {
  memory: Memory;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative h-[80vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white dark:bg-gray-900"
      >
        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-4">
          <div>
            <h2 className="text-xl font-bold text-white">{memory.title}</h2>
            <p className="text-white/80">{memory.description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main image */}
        <div className="relative h-full w-full">
          {memory.files[currentIndex] && (
            <Image
              src={`/api/thumbnail/${memory.files[currentIndex].id}`}
              alt=""
              fill
              className="object-contain"
            />
          )}
        </div>

        {/* Navigation */}
        {memory.files.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((i) => (i > 0 ? i - 1 : memory.files.length - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white hover:bg-black/60"
            >
              <ChevronRight className="h-6 w-6 rotate-180" />
            </button>
            <button
              onClick={() => setCurrentIndex((i) => (i < memory.files.length - 1 ? i + 1 : 0))}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white hover:bg-black/60"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Thumbnails */}
        <div className="absolute bottom-0 left-0 right-0 flex gap-2 overflow-x-auto bg-gradient-to-t from-black/50 to-transparent p-4">
          {memory.files.slice(0, 10).map((file, index) => (
            <button
              key={file.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg ${
                index === currentIndex ? 'ring-2 ring-white' : 'opacity-60'
              }`}
            >
              <Image
                src={`/api/thumbnail/${file.id}`}
                alt=""
                fill
                className="object-cover"
              />
            </button>
          ))}
          {memory.files.length > 10 && (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-black/40 text-white">
              +{memory.files.length - 10}
            </div>
          )}
        </div>

        {/* Counter */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-sm text-white">
          {currentIndex + 1} / {memory.files.length}
        </div>
      </motion.div>
    </div>
  );
}
