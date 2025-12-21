import { useEffect, useState } from "react";
import {
  listSavedQueries,
  listSavedQueryTags,
} from "../../api/savedQueriesApi";

type SavedQueriesProps = {
  projectId?: number;
};

type SavedQueryItem = {
  id: number;
  name: string;
  description?: string | null;
  sql?: string;
  tags?: { id: number; name: string }[] | string[];
};

const SavedQueries = ({ projectId }: SavedQueriesProps) => {
  const [queries, setQueries] = useState<SavedQueryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchQueries = async () => {
      if (!projectId) {
        setQueries([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await listSavedQueries(projectId, {
          tag: selectedTag || undefined,
        });
        const rows = (data as { sQueries?: SavedQueryItem[] })?.sQueries ?? [];
        setQueries(rows);

        // Build tags from queries as fallback so dropdown is always populated.
        const derivedTags = rows
          .flatMap((q) => q.tags ?? [])
          .map((t) => (typeof t === "string" ? { id: 0, name: t } : t))
          .filter((t): t is { id: number; name: string } =>
            Boolean(t && typeof t.name === "string")
          );

        if (derivedTags.length) {
          const deduped = Array.from(
            new Map(derivedTags.map((t) => [t.name, t])).values()
          );
          setTags((prev) => {
            const merged = [...prev, ...deduped];
            const dedup = Array.from(
              new Map(merged.map((t) => [t.name, t])).values()
            );
            return dedup;
          });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Nie udało się pobrać zapisanych zapytań.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchQueries();
  }, [projectId, selectedTag, refreshKey]);

  useEffect(() => {
    const fetchTags = async () => {
      if (!projectId) {
        setTags([]);
        return;
      }
      try {
        const data = await listSavedQueryTags(projectId);
        const maybeArray = Array.isArray(data)
          ? data
          : (data as { tags?: { id: number; name: string }[] })?.tags ??
            Object.values(data as Record<string, unknown>).filter(
              (item) =>
                item && typeof item === "object" && "name" in (item as any)
            );

        const normalized = (maybeArray as any[]).filter(
          (t) => t && typeof t === "object" && "name" in t
        ) as { id: number; name: string }[];

        const deduped = Array.from(
          new Map(normalized.map((t) => [t.name, t])).values()
        );

        setTags(deduped ?? []);
      } catch (err) {
        // keep silent; tags are optional for rendering
      }
    };

    fetchTags();
  }, [projectId, refreshKey]);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      if (!projectId) return;
      const detail = (event as CustomEvent<{ projectId?: number }>).detail;
      if (detail?.projectId && detail.projectId !== projectId) return;
      setRefreshKey((k) => k + 1);
    };

    window.addEventListener("savedQueries:refresh", handleRefresh);
    return () =>
      window.removeEventListener("savedQueries:refresh", handleRefresh);
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="text-sm text-neutral-400">
        Zapisane zapytania są dostępne w widoku projektu. Otwórz projekt, aby je
        zobaczyć.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-neutral-100">
      <h3 className="text-lg font-semibold text-neutral-200">
        Zapisane zapytania
      </h3>
      <div className="flex items-center gap-2 text-sm text-neutral-300">
        <label className="text-neutral-400">Filtr tag:</label>
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="rounded-xl border border-neutral-600 bg-neutral-800 px-3 py-1 text-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500/50"
        >
          <option value="">Wszystkie</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>
      {loading && <p className="text-sm text-neutral-400">Ładowanie...</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {!loading && queries.length === 0 && !error && (
        <p className="text-sm text-neutral-500">Brak zapisanych zapytań.</p>
      )}
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {queries.map((query) => (
          <div
            key={query.id}
            className="rounded-2xl border border-neutral-700 bg-neutral-800/80 p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-orange-100">
                  {query.name}
                </p>
                {query.description && (
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-3">
                    {query.description}
                  </p>
                )}
              </div>
            </div>
            {query.tags && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(query.tags as any[]).map((tag, idx) => {
                  const label = typeof tag === "string" ? tag : tag?.name;
                  return (
                    <span
                      key={idx}
                      className="rounded-full border border-neutral-600 px-2 py-1 text-[11px] text-neutral-300 bg-neutral-700/60"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
            {query.sql && (
              <pre className="mt-2 max-h-24 overflow-y-auto rounded-lg bg-neutral-900/80 p-2 text-[11px] text-neutral-200 whitespace-pre-wrap border border-neutral-700">
                {query.sql}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedQueries;
