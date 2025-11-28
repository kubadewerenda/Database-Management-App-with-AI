const API_URL = "http://localhost:8000";

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
  connectionString: string
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
export const chatHistory = async (id: number) => {
  try {
    const response = await fetch(`${API_URL}/project/${id}/chat/history`, {
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
