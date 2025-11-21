const API_URL = "http://localhost:8000";

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
