import DbConnection from "../components/project-details/DbConnection";
import ResizableDetails from "../components/project-details/ResizableDetails";
import { useParams } from "react-router-dom";
import { fetchProject } from "../api/projectDetailsApi";
import { useEffect, useState } from "react";
import { PuffLoader } from "react-spinners";

const ProjectDetails = () => {
  type ProjectType = {
    id: number;
    name: string;
    color: string;
    description: string | null;
    ownerId: number;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
  };

  const [projectData, setProjectData] = useState<ProjectType | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isConnected, setIsConnected] = useState(false);

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
      <div className="flex w-full h-full justify-center items-center">
        <PuffLoader color="#e6901d" speedMultiplier={1} size={60} />
      </div>
    );
  }

  return (
    <section className="flex h-full flex-col text-neutral-200">
      <div className="h-full overflow-y-auto w-full">
        {!isConnected && <DbConnection setIsConnected={setIsConnected} />}
        {isConnected && (
          <ResizableDetails
            id={id}
            color={projectData.color}
            name={projectData.name}
          />
        )}
      </div>
    </section>
  );
};

export default ProjectDetails;
