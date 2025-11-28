const API_URL = "http://localhost:8000";

export const deleteProject = async (projectId: number) => {
  try {
    const response = await fetch(`${API_URL}/project/${projectId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to delete project");
    }
  } catch (error) {
    console.error(error);
    throw error instanceof Error
      ? error
      : new Error("Failed to delete project");
  }
};

export const fetchProjects = async () => {
  try {
    const response = await fetch(`${API_URL}/project`, {
      credentials: "include",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
};

export const updateProjectData = async (
  projectId: number,
  projectName: string,
  projectDescription: string
) => {
  try {
    const response = await fetch(`${API_URL}/project/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        name: projectName,
        description: projectDescription,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to update project data");
    }

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
};
