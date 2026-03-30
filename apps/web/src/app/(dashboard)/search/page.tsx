'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Image, Film, X, User, MapPin, Calendar, Sparkles, Mountain, Building2, Eye } from 'lucide-react';
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
  const [parsedInfo, setParsedInfo] = useState<{
    personNames: string[];
    locationTerms: string[];
    dateRange: { from: string; to: string } | null;
    sceneFilters?: { field: string; value: string }[];
    faceFilters?: { field: string; value: string }[];
    keywords: string[];
  } | null>(null);

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
      if (data.parsed) {
        setParsedInfo(data.parsed);
      }
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
              placeholder="npr. Branka u Vranju pre 5 meseci..."
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

        {/* Parsed query info — shows what the AI understood */}
        {parsedInfo && query && !isSearching && (
          (parsedInfo.personNames.length > 0 || parsedInfo.locationTerms.length > 0 || parsedInfo.dateRange) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-gray-400">Prepoznato:</span>
              {parsedInfo.personNames.map((name) => (
                <span key={name} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  <User className="h-3 w-3" />
                  {name}
                </span>
              ))}
              {parsedInfo.locationTerms.map((loc) => (
                <span key={loc} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  <MapPin className="h-3 w-3" />
                  {loc}
                </span>
              ))}
              {parsedInfo.dateRange && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <Calendar className="h-3 w-3" />
                  {new Date(parsedInfo.dateRange.from).toLocaleDateString('sr-RS')} — {new Date(parsedInfo.dateRange.to).toLocaleDateString('sr-RS')}
                </span>
              )}
              {parsedInfo.sceneFilters?.map((f, i) => (
                <span key={`s-${i}`} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Mountain className="h-3 w-3" />
                  {f.field}: {f.value}
                </span>
              ))}
              {parsedInfo.faceFilters?.map((f, i) => (
                <span key={`f-${i}`} className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2.5 py-0.5 text-xs text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                  <Eye className="h-3 w-3" />
                  {f.field}: {f.value}
                </span>
              ))}
            </div>
          )
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <Search className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">Pametna pretraga</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Pretražujte prirodnim jezikom — po osobi, mestu, vremenu ili bilo čemu na slici
          </p>

          {/* Example queries */}
          <div className="mt-8 w-full max-w-md">
            <p className="mb-3 text-xs font-medium text-gray-400">Probajte na primer:</p>
            <div className="grid gap-2">
              {[
                'Branka u Vranju pre 5 meseci',
                'plaža prošlog leta',
                'brda i livade',
                'moderna zgrada u gradu',
                'stara gradnja noću',
                'plavuša na planini',
                'zalazak sunca na moru',
                'Marko i Ana na rođendanu',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setLocalQuery(example);
                    router.push(`/search?q=${encodeURIComponent(example)}`);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm text-gray-600 transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-sky-600 dark:hover:bg-sky-900/20"
                >
                  <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  {example}
                </button>
              ))}
            </div>
          </div>
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
