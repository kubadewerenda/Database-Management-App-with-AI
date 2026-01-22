const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
    console.log("Sending update:", {
      projectId,
      projectName,
      projectDescription,
    });

    const body: { name: string; description?: string } = {
      name: projectName,
    };

    if (projectDescription && projectDescription.trim()) {
      body.description = projectDescription;
    }

    const response = await fetch(`${API_URL}/project/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Server response:", response.status, errorData);
      console.error("Validation details:", errorData?.details);
      throw new Error(
        errorData?.message ||
          `Failed to update project data: ${response.status}`
      );
    }

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    throw error instanceof Error
      ? error
      : new Error("Failed to update project data");
  }
};
