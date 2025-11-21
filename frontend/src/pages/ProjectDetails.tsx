import { useLocation, useNavigate } from "react-router-dom";
import type { Location } from "react-router-dom";
import DbConnection from "../components/project-details/DbConnection";

const ProjectDetails = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as Location & {
    state?: { projectName?: string };
  };
  const projectName = state?.projectName || "Projekt";

  return (
    <section className="flex h-full flex-col gap-8 text-neutral-200 bg-amber-900">
      <header className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-200">
            {projectName}
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
      <div>
        <DbConnection />
      </div>
    </section>
  );
};

export default ProjectDetails;
