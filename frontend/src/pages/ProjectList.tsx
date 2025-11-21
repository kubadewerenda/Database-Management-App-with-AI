import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { IoArrowForward, IoPencil } from "react-icons/io5";
import { BsSearch } from "react-icons/bs";
import { GoSortAsc } from "react-icons/go";
import { TbListLetters } from "react-icons/tb";
import { CiCalendarDate } from "react-icons/ci";
import { BsCalendar2DateFill } from "react-icons/bs";
import { IoMdClose } from "react-icons/io";

import { fetchProjects } from "../api/projectsApi";

import ProjectEditPopup from "../components/settings-components/ProjectEditPopup";

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

  const [searchedName, setSearchedName] = useState("");

  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);

  const navigate = useNavigate();
  const { refreshTrigger } = useOutletContext<{ refreshTrigger: number }>();

  useEffect(() => {
    const loadProjects = async () => {
      const data = await fetchProjects();
      setAllProjects(data.projects);
    };
    loadProjects();
  }, [refreshTrigger, isEditPopupOpen]);

  const handleOpenProject = (project: ProjectType) => {
    navigate(`/dashboard/projects/${project.id}`, {
      state: {
        projectName: project.name,
      },
    });
  };

  const sortedProjects = useMemo(() => {
    const filtered = allProjects.filter((element) =>
      element.name.toLowerCase().includes(searchedName.toLowerCase())
    );

    if (!isItemsSorted) {
      return filtered;
    }

    switch (isItemsSorted) {
      case "alphabetical":
        return filtered.sort((a, b) => a.name.localeCompare(b.name, "pl"));
      case "oldest":
        return filtered.sort(
          (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
        );
      case "newest":
        return filtered.sort(
          (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
        );
      default:
        return allProjects;
    }
  }, [allProjects, isItemsSorted, searchedName]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-10 p-4">
      <div className="flex justify-between gap-2 ">
        <div className="relative flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-neutral-200">Projekty</h2>
          <p className="text-neutral-400 text-sm">
            Kliknij projekt, aby otworzyć jego workspace z połączeniem do bazy,
            zapytaniami i historią.
          </p>
          {/* <div className="h-px w-full bg-neutral-600"></div> */}
          <div className="pointer-events-none absolute left-0 top-full h-[50vh] w-full -z-10 bg-linear-to-b from-orange-400/70 via-orange-900/20 to-transparent blur-xl"></div>
        </div>
        <div className="flex gap-4 items-center">
          {/* <h3 className="font-semibold text-neutral-300">Wyszukiwanie</h3> */}
          <div className="flex items-center gap-2">
            <BsSearch className="text-neutral-400" size={20} />
            <input
              value={searchedName}
              onChange={(e) => setSearchedName(e.target.value)}
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
                <div className="absolute top-7 -right-10 text-neutral-400 bg-neutral-900/90 z-50 border border-neutral-400/30 p-4 rounded-2xl w-50 flex flex-col items-center gap-3">
                  <p className="font-semibold">Sortowanie</p>
                  <div className="h-px w-36 bg-neutral-600"></div>
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

      {sortedProjects.length > 0 ? (
        <div className="grid flex-1 min-h-0 grid-cols-1 content-start items-start gap-6 overflow-y-auto xl:grid-cols-2">
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
                className="group relative flex w-full min-h-[200px] flex-col gap-6 rounded-2xl border border-neutral-700/60 bg-neutral-800/40 p-6 text-left shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition duration-300 hover:border-orange-400/60 hover:cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-lg font-bold text-orange-200">
                      {initial}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold text-neutral-300">
                        {element.name}
                      </h3>
                      <p className="text-xs uppercase font-bold text-neutral-500">
                        Ostatnia aktualizacja {updatedAt}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                    <span className="h-2.5 w-2.5  rounded-full bg-emerald-400"></span>
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
                    setIsEditPopupOpen(true);
                  }}
                >
                  <IoPencil size={16} />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm font-thin text-neutral-500">
          Nie znaleziono pasujących projektów
        </div>
      )}

      {modalProject && isEditPopupOpen && (
        <ProjectEditPopup
          modalProject={modalProject}
          setIsEditPopupOpen={setIsEditPopupOpen}
        />
      )}
    </div>
  );
};

export default ProjectList;
