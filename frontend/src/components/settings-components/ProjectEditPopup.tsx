import { useState } from "react";
import { deleteProject, updateProjectData } from "../../api/projectsApi";
import { IoClose } from "react-icons/io5";

type ProjectType = {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
};

type ProjectEditPopupProps = {
  modalProject: ProjectType;
  setIsEditPopupOpen: (isOpen: boolean) => void;
};

const ProjectEditPopup = ({
  modalProject,
  setIsEditPopupOpen,
}: ProjectEditPopupProps) => {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleDelete = async () => {
    await deleteProject(modalProject.id);
    setIsEditPopupOpen(false);
  };

  const handleUpdateProjectData = async () => {
    await updateProjectData(modalProject.id, newName, newDesc);
    setIsEditPopupOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="max-w-sm space-y-4 bg-neutral-900/90 p-6 text-neutral-100 relative rounded-3xl border border-neutral-500/20 py-16 w-96 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-400">
            Edycja projektu
          </h2>
          <h3 className="text-neutral-500">{modalProject.name}</h3>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <label htmlFor="name" className="text-neutral-300 font-semibold">
              Nowa nazwa:
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              id="name"
              type="text"
              className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold focus:border-neutral-400/60 focus:ring-2 focus:ring-neutral-500/40 transition"
              placeholder="Podaj nazwa ..."
            />
          </div>
          <div className="flex flex-col gap-3">
            <label htmlFor="desc" className="font-bold text-neutral-300">
              Nowy Opis:
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              id="desc"
              placeholder="Podaj opis ... "
              className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold h-32 resize-none focus:border-neutral-400/60 focus:ring-2 focus:ring-neutral-500/40 transition"
            ></textarea>
          </div>
          <button
            onClick={handleUpdateProjectData}
            className="w-fit px-4 bg-orange-500/20 rounded-2xl border border-orange-600/20 py-2 font-semibold text-orange-200 hover:cursor-pointer hover:bg-orange-500/30 transition"
          >
            Aktualizuj
          </button>
        </div>
        <button
          onClick={() => setIsEditPopupOpen(false)}
          className="absolute top-4 right-4 text-neutral-400 hover:cursor-pointer hover:text-orange-400 transition hover:bg-red-300/20 rounded-full"
        >
          <IoClose size={20} />
        </button>
        <div className="w-full h-px bg-neutral-600"></div>
        <div className="flex items-center justify-between">
          <p className="text-neutral-400 font-semibold">Usuń projekt</p>
          <button
            onClick={handleDelete}
            className="bg-neutral-600/40 py-1 px-3 rounded-2xl border border-neutral-500 text-neutral-300 font-semibold hover:bg-rose-500 hover:cursor-pointer hover:border-rose-300 hover:text-rose-100 transition"
          >
            Usuń
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectEditPopup;
