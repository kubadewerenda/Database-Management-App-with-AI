import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { IoArrowForward, IoPencil } from "react-icons/io5";
import { BsSearch } from "react-icons/bs";
import { GoSortAsc } from "react-icons/go";
import { TbListLetters } from "react-icons/tb";
import { CiCalendarDate } from "react-icons/ci";
import { BsCalendar2DateFill } from "react-icons/bs";
import { IoMdClose } from "react-icons/io";

const ProjectList = () => {
  type ProjectType = {
    id: number;
    name: string;
    description: string | null;
    ownerId: number;
    createdAt: string;
    updatedAt: string;
  };

  const [allProjects, setAllProjects] = useState<ProjectType[]>([]);
  const [modalProject, setModalProject] = useState<ProjectType | null>(null);

  const [isSortIconHovering, setIsSortIconHovering] = useState(false);
  const [isItemsSorted, setIsItemsSorted] = useState("");

  const navigate = useNavigate();
  const { refreshTrigger } = useOutletContext<{ refreshTrigger: number }>();

  const API_URL = "http://localhost:8000";

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/project`, {
        credentials: "include",
      });
      const data = await response.json();
      setAllProjects(data.projects);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteProject = async (projectId: number) => {
    try {
      const response = await fetch(`${API_URL}/project/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      await fetchProjects();
      setModalProject(null);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  const handleOpenProject = (project: ProjectType) => {
    navigate(`/dashboard/projects/${project.id}`, {
      state: {
        projectName: project.name,
      },
    });
  };

  const sortedProjects = useMemo(() => {
    if (!isItemsSorted) {
      return allProjects;
    }

    const projectsCopy = [...allProjects];

    switch (isItemsSorted) {
      case "alphabetical":
        return projectsCopy.sort((a, b) => a.name.localeCompare(b.name, "pl"));
      case "oldest":
        return projectsCopy.sort(
          (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
        );
      case "newest":
        return projectsCopy.sort(
          (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
        );
      default:
        return allProjects;
    }
  }, [allProjects, isItemsSorted]);

  return (
    <div className="flex flex-col gap-10 p-4">
      <div className="flex justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold text-neutral-100">Projekty</h2>
          <p className="text-neutral-400">
            Kliknij projekt, aby otworzyć jego workspace z połączeniem do bazy,
            zapytaniami i historią.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {/* <h3 className="font-semibold text-neutral-300">Wyszukiwanie</h3> */}
          <div className="flex items-center gap-2">
            <BsSearch className="text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="Nazwa ..."
              className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-1 font-semibold focus:neutral-orange-400/60 focus:ring-2 focus:ring-neutral-500/40 transition text-neutral-300"
            />
          </div>
          <div className="w-px h-10 bg-neutral-600 ml-1"></div>
          <div>
            <div
              onMouseEnter={() => setIsSortIconHovering(true)}
              onMouseLeave={() => setIsSortIconHovering(false)}
              className="relative p-1"
            >
              {isSortIconHovering && (
                <div className="absolute top-7 -right-15 text-neutral-400 bg-neutral-900/90 z-50 border border-neutral-400/30 p-4 rounded-2xl w-50 flex flex-col items-center gap-3">
                  <p className="font-semibold">Sortowanie</p>
                  <div className="h-px w-36 bg-neutral-500"></div>
                  <div className="font-semibold flex flex-col gap-1">
                    <button
                      className="flex items-center gap-2 hover:bg-neutral-800 rounded-2xl p-1 hover:cursor-pointer"
                      onClick={() => {
                        setIsItemsSorted("alphabetical");
                        setIsSortIconHovering(false);
                      }}
                    >
                      <TbListLetters size={18} />
                      <p>Alfabatycznie</p>
                    </button>
                    <button
                      className="flex items-centerm gap-2 hover:bg-neutral-800 rounded-2xl p-1 hover:cursor-pointer"
                      onClick={() => {
                        setIsItemsSorted("oldest");
                        setIsSortIconHovering(false);
                      }}
                    >
                      <CiCalendarDate size={18} />
                      <p>Od Najstarszego</p>
                    </button>
                    <button
                      className="flex items-center gap-2 hover:bg-neutral-800 rounded-2xl p-1 hover:cursor-pointer"
                      onClick={() => {
                        setIsItemsSorted("newest");
                        setIsSortIconHovering(false);
                      }}
                    >
                      <BsCalendar2DateFill size={18} />
                      <p>Od Najnowszego</p>
                    </button>
                  </div>
                </div>
              )}

              <GoSortAsc
                className="text-neutral-400 hover:cursor-pointer transition"
                size={25}
              />
            </div>
          </div>
          {isItemsSorted && (
            <div className="flex items-center gap-4">
              <div className="w-px h-10 bg-neutral-600"></div>
              <div className="flex items-center gap-2 border border-orange-400/40 rounded-2xl p-3">
                {isItemsSorted === "alphabetical" ? (
                  <TbListLetters className="text-neutral-400" size={24} />
                ) : isItemsSorted === "oldest" ? (
                  <CiCalendarDate className="text-neutral-400" size={24} />
                ) : (
                  <BsCalendar2DateFill className="text-neutral-400" size={24} />
                )}
                <button onClick={() => setIsItemsSorted("")}>
                  <IoMdClose
                    className="text-neutral-300 hover:bg-orange-300/40 rounded-2xl hover:cursor-pointer hover:text-orange-200 transition"
                    size={20}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {sortedProjects.map((element) => {
          const initial = element.name.charAt(0).toUpperCase();
          const updatedAt = new Date(element.updatedAt).toLocaleDateString(
            "pl-PL",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }
          );

          return (
            <button
              type="button"
              key={element.id}
              onClick={() => handleOpenProject(element)}
              className="group relative flex h-full w-full flex-col gap-6 rounded-3xl border border-neutral-700/60 bg-neutral-800/40 p-6 text-left shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition duration-300 hover:border-orange-400/60 hover:cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-lg font-bold text-orange-200">
                    {initial}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {element.name}
                    </h3>
                    <p className="text-xs uppercase font-bold text-neutral-500">
                      Ostatnia aktualizacja {updatedAt}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-2 text-sm font-semibold text-neutral-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                  Aktywny
                </span>
              </div>

              <p className="text-sm text-neutral-400 line-clamp-3">
                {element?.description || "Brak opisu projektu."}
              </p>

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-2 font-semibold text-nautral-300">
                  Otwórz
                  <IoArrowForward className="transition group-hover:translate-x-1" />
                </span>
              </div>

              <div
                className="absolute bottom-4 right-4 hidden rounded-2xl border border-neutral-600/60 bg-neutral-900/80 p-2 text-neutral-300 transition hover:border-orange-400/60 hover:text-orange-300 group-hover:flex hover:cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  setModalProject(element);
                }}
              >
                <IoPencil size={16} />
              </div>
            </button>
          );
        })}
      </div>

      {modalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm space-y-4 bg-neutral-900 p-6 text-neutral-100">
            <h3 className="text-xl font-semibold">{modalProject.name}</h3>
            <p>Usunąć projekt?</p>
            <div className="flex justify-end gap-3 text-sm">
              <button type="button" onClick={() => setModalProject(null)}>
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => deleteProject(modalProject.id)}
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
