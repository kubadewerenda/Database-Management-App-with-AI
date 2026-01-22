const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export type SavedQueryPayload = {
  name: string;
  description?: string | null;
  sql: string;
  tags: string[];
};

export const saveQuery = async (
  projectId: number,
  payload: SavedQueryPayload
) => {
  const response = await fetch(`${API_URL}/project/${projectId}/query/saved`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ?? "Nie zapisano zapytania.";
    throw new Error(message);
  }
  return data;
};

export const listSavedQueries = async (
  projectId: number,
  options?: { tag?: string; limit?: number; beforeId?: number }
) => {
  const url = new URL(`${API_URL}/project/${projectId}/query/saved`);
  if (options?.tag) url.searchParams.set("tag", options.tag);
  if (options?.limit) url.searchParams.set("limit", String(options.limit));
  if (options?.beforeId)
    url.searchParams.set("beforeId", String(options.beforeId));

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ??
      "Nie pobrano zapisanych zapytań.";
    throw new Error(message);
  }
  return data as {
    sQueries?: unknown[];
    hasMore?: boolean;
    nextCursor?: number | null;
  };
};

export const listSavedQueryTags = async (projectId: number) => {
  const response = await fetch(`${API_URL}/project/${projectId}/query/tags`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ?? "Nie pobrano tagów zapytań.";
    throw new Error(message);
  }
  return data as
    | { tags?: { id: number; name: string }[] }
    | { [key: string]: { id: number; name: string } }
    | { id: number; name: string }[];
};
