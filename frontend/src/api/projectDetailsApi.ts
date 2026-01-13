const API_URL = "http://13.37.105.59/";

//POJEDYNCZY PROJEKT
export const fetchProject = async (id: number) => {
  try {
    const response = await fetch(`${API_URL}/project/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await response.json();
    if (!response.ok) {
      return data;
    }
    return data;
  } catch (error) {
    console.error(error);
  }
};

//CONNECTION STRING
export const sendConnectionString = async (
  id: number,
  connectionString: string,
  dbType: string
) => {
  try {
    const response = await fetch(`${API_URL}/project/${id}/db-connection`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        connectionString: connectionString,
        name: "test",
        dbType: dbType,
        readonly: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return data;
    }
    return data;
  } catch (error) {
    console.error(error);
  }
};

// SCHEMAT BAZY DANYCH
export const projectOverview = async (id: number) => {
  try {
    const response = await fetch(`${API_URL}/project/${id}/overview`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    if (!response.ok) {
      return data;
    }
    return data;
  } catch (error) {
    console.error(error);
  }
};

//CHAT HISTORY
export const chatHistory = async (projectId: number, chatId: number) => {
  try {
    const response = await fetch(
      `${API_URL}/project/${projectId}/chat/${chatId}/history`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Failed to fetch chat history");
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

//WYSYLANIE WIADOMOSCI DO AI
export const sendMessage = async (
  projectId: number,
  chatId: number,
  userMessage: string
) => {
  try {
    const response = await fetch(
      `${API_URL}/project/${projectId}/chat/${chatId}/message`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Failed to send chat message");
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// ===================================================================================
//LISTA TERMNINALI
export const fetchTerminals = async (projectId: number) => {
  try {
    const response = await fetch(`${API_URL}/project/${projectId}/executors`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("error");
    }
    return data;
  } catch (error) {
    console.error(error);
  }
};

//DODAWANIE NOWEGO TERMINALA
export const createTerminal = async (projectId: number) => {
  const response = await fetch(`${API_URL}/project/${projectId}/executors`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("");
  }
  return data;
};

//ZMIANA NAZWY TERMINALA
export const renameTerminal = async (
  projectId: number,
  executorId: number,
  name: string
) => {
  const response = await fetch(
    `${API_URL}/project/${projectId}/executors/${executorId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { message?: string })?.message ?? "rename failed");
  }
  return data;
};

//UUSWANIE TERMINALA
export const deleteTerminal = async (projectId: number, executorId: number) => {
  const response = await fetch(
    `${API_URL}/project/${projectId}/executors/${executorId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { message?: string })?.message ?? "delete failed");
  }
  return data;
};

export const fetchExecutor = async (projectId: number, executorId: number) => {
  try {
    const response = await fetch(
      `${API_URL}/project/${projectId}/executor/${executorId}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
};

export const executeSql = async (
  projectId: number,
  executorId: number,
  sql: string
) => {
  const response = await fetch(
    `${API_URL}/project/${projectId}/executors/${executorId}/execute`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Execution failed");
  }
  return data;
};
