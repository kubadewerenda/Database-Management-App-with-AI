import { useNavigate } from "react-router-dom";
import DbConnection from "../components/project-details/DbConnection";
import ResizableDetails from "../components/project-details/ResizableDetails";
import { useParams } from "react-router-dom";
import { fetchProject } from "../api/projectDetailsApi";
import { useEffect, useState } from "react";

const ProjectDetails = () => {
  type ProjectType = {
    id: number;
    name: string;
    description: string | null;
    ownerId: number;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
  };

  const [projectData, setProjectData] = useState<ProjectType | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isConnected, setIsConnected] = useState(false);

  const navigate = useNavigate();

  const { projectId } = useParams();
  const id = Number(projectId);

  useEffect(() => {
    const handleFetchingData = async () => {
      try {
        setIsLoading(true);
        const response = await fetchProject(id);
        console.log(response);
        setProjectData(response.project);
        if (response.project.isActive === true) {
          setIsConnected(true);
        }
        // console.log(projectData);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    handleFetchingData();
  }, [id]);

  useEffect(() => {}, []);

  if (isLoading || !projectData) {
    return (
      <div className="flex justify-center items-center">Ładowanie projektu</div>
    );
  }

  return (
    <section className="flex h-full flex-col text-neutral-200">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold pl-4 text-neutral-200">
            {projectData.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-2xl border border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-orange-500 hover:text-orange-400"
        >
          Wróć do listy
        </button>
      </header>
      <div className="h-full overflow-y-auto">
        {!isConnected && <DbConnection setIsConnected={setIsConnected} />}
        {isConnected && <ResizableDetails id={id} />}
      </div>
    </section>
  );
};

export default ProjectDetails;
