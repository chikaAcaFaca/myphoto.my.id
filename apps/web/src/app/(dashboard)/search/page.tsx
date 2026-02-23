'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Image, Film, X } from 'lucide-react';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { getIdToken } from '@/lib/firebase';
import type { FileMetadata } from '@myphoto/shared';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState<FileMetadata[]>([]);
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Local search input (for editing before submitting)
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const performSearch = useCallback(async (searchQuery: string, pageNum: number, fileType?: string, append = false) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setError('Niste prijavljeni');
        return;
      }

      const filters: Record<string, any> = {};
      if (fileType) filters.type = fileType;

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          filters,
          page: pageNum,
          pageSize: 50,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Pretraga nije uspela');
      }

      const data = await res.json();

      const files: FileMetadata[] = data.items.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        takenAt: item.takenAt ? new Date(item.takenAt) : undefined,
        trashedAt: item.trashedAt ? new Date(item.trashedAt) : undefined,
      }));

      if (append) {
        setResults((prev) => [...prev, ...files]);
      } else {
        setResults(files);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Search when query or filter changes
  useEffect(() => {
    setPage(1);
    performSearch(query, 1, typeFilter || undefined);
  }, [query, typeFilter, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(localQuery.trim())}`);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    performSearch(query, nextPage, typeFilter || undefined, true);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pretraga</h1>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Pretražite po imenu, oznakama, tekstu..."
              className="input pl-10"
              autoFocus
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => {
                  setLocalQuery('');
                  router.push('/search');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary">
            Traži
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
          >
            <Filter className="h-4 w-4" />
          </button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter('')}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                !typeFilter
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Sve
            </button>
            <button
              onClick={() => setTypeFilter('image')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                typeFilter === 'image'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <Image className="h-3.5 w-3.5" />
              Slike
            </button>
            <button
              onClick={() => setTypeFilter('video')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                typeFilter === 'video'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <Film className="h-3.5 w-3.5" />
              Video
            </button>
          </div>
        )}

        {/* Results count */}
        {query && !isSearching && (
          <p className="mt-3 text-sm text-gray-500">
            {total === 0
              ? `Nema rezultata za "${query}"`
              : `${total} ${total === 1 ? 'rezultat' : 'rezultata'} za "${query}"`}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {query ? (
        <>
          <PhotoGrid files={results} isLoading={isSearching && page === 1} />

          {hasMore && (
            <div className="flex justify-center py-8">
              {isSearching ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
              ) : (
                <button onClick={handleLoadMore} className="btn-secondary">
                  Učitaj još
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        /* Empty state - no query */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <Search className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">Pretražite svoje fajlove</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Pretražujte po imenu fajla, AI oznakama ili tekstu na slikama
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
