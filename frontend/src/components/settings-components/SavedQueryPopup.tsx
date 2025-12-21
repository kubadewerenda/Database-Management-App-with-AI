import { useEffect, useState } from "react";
import { CiSaveDown2 } from "react-icons/ci";
import { saveQuery } from "../../api/savedQueriesApi";

type SavedQueryPopupProps = {
  projectId: number;
  onClose?: () => void;
  onSaved?: () => void;
  initialSqlSnippet?: string;
  initialName?: string;
  initialDescription?: string;
  initialTags?: string[];
};

const SavedQueryPopup = ({
  projectId,
  onClose,
  onSaved,
  initialSqlSnippet = "",
  initialName = "",
  initialDescription = "",
  initialTags = [],
}: SavedQueryPopupProps) => {
  const [queryName, setQueryName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [sqlSnippet, setSqlSnippet] = useState(initialSqlSnippet);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const initialTagsKey = Array.isArray(initialTags)
    ? initialTags.join(",")
    : "";

  useEffect(() => {
    setQueryName(initialName);
    setDescription(initialDescription);
    setSqlSnippet(initialSqlSnippet);
    setTagsInput(initialTags.join(", "));
    setError("");
  }, [initialDescription, initialName, initialSqlSnippet, initialTagsKey]);

  const handleSaveClick = async () => {
    const parsedTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const trimmedName = queryName.trim();
    const trimmedDesc = description.trim();
    const trimmedSql = sqlSnippet.trim();

    if (!trimmedName) {
      setError("Podaj nazwę zapytania.");
      return;
    }

    if (!trimmedDesc) {
      setError("Dodaj opis zapytania.");
      return;
    }

    if (parsedTags.length === 0) {
      setError("Dodaj co najmniej jeden tag.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      await saveQuery(projectId, {
        name: trimmedName,
        description: trimmedDesc,
        sql: trimmedSql,
        tags: parsedTags,
      });
      window.dispatchEvent(
        new CustomEvent("savedQueries:refresh", {
          detail: { projectId },
        })
      );
      onSaved?.();
      onClose?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Nie udało się zapisać.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="relative max-w-sm space-y-3 bg-neutral-900/90 p-5 text-neutral-100 rounded-3xl border border-neutral-500/20 w-96 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-300">
            Zapisz zapytanie
          </h2>
          <h3 className="text-xs text-neutral-500">
            {queryName.trim() === "" ? "Nowe zapytanie" : queryName}
          </h3>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <label
              htmlFor="query-name"
              className="text-neutral-300 font-semibold"
            >
              Nazwa zapytania (wymagana):
            </label>
            <input
              id="query-name"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              type="text"
              placeholder="Podaj nazwę..."
              className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold focus:border-neutral-400/60 focus:ring-2 focus:ring-neutral-500/40 transition"
              required
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="query-desc" className="font-bold text-neutral-300">
              Opis (wymagany):
            </label>
            <textarea
              id="query-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodaj krótki opis..."
              className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold h-20 resize-none focus:border-neutral-400/60 focus:ring-2 focus:ring-neutral-500/40 transition"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="query-sql" className="font-bold text-neutral-300">
              Fragment SQL (opcjonalnie):
            </label>
            <textarea
              id="query-sql"
              value={sqlSnippet}
              onChange={(e) => setSqlSnippet(e.target.value)}
              placeholder="Wklej zapytanie lub jego fragment..."
              className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold h-24 resize-none focus:border-neutral-400/60 focus:ring-2 focus:ring-neutral-500/40 transition"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="query-tags" className="font-bold text-neutral-300">
              Tagi (oddziel przecinkami):
            </label>
            <input
              id="query-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="np. performance, raport, billing"
              className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold focus:border-neutral-400/60 focus:ring-2 focus:ring-neutral-500/40 transition"
            />
          </div>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="w-full h-px bg-neutral-600" />
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-orange-600/30 text-orange-200 font-semibold bg-orange-500/15 hover:bg-orange-500/25 hover:cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CiSaveDown2 size={18} />
            {isSaving ? "Zapisuję..." : "Zapisz"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl border border-neutral-600/60 text-neutral-300 font-semibold hover:bg-neutral-700/60 hover:cursor-pointer transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavedQueryPopup;
