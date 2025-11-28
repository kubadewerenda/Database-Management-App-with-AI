import React, { useState } from "react";
import { IoMdArrowRoundForward } from "react-icons/io";
import ColorPanel from "../settings-components/ColorPanel";
import { IoColorPaletteOutline } from "react-icons/io5";

type ProjectProps = {
  onProjectCreated?: () => void;
};

const Projects = ({ onProjectCreated }: ProjectProps) => {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [error, setError] = useState(false);
  const [color, setColor] = useState("");

  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);

  const API_URL = "http://localhost:8000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (projectName.trim().length >= 3) {
      setError(false);
      try {
        const response = await fetch(`${API_URL}/project`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: projectName,
            description: projectDescription,
            color: color,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to create project");
        }

        const data = await response.json();
        console.log(data.project);

        setProjectName("");
        setProjectDescription("");

        onProjectCreated?.();
      } catch (error) {
        console.error(error);
      }
    } else {
      setError(true);
    }
  };

  return (
    <div className="text-neutral-300 py-6 px-2 flex flex-col gap-6 rounded-3xl shadow-lg">
      <div className="flex flex-col gap-2">
        <label htmlFor="project-name" className="font-semibold text-sm">
          Nazwa projektu:
        </label>
        <input
          id="project-name"
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold focus:border-orange-400/60 focus:ring-2 focus:ring-orange-500/40 transition text-sm"
          placeholder="Podaj nazwe ..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="desc" className="font-semibold text-sm">
          Opis:
        </label>
        <textarea
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          id="desc"
          placeholder="Podaj opis ... "
          className="outline-none border border-neutral-500/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold h-32 resize-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-500/40 transition text-sm"
        ></textarea>
      </div>
      <div className="flex items-center gap-2 relative">
        <p className="font-semibold text-sm">Kolor:</p>
        <div
          onMouseEnter={() => setIsColorPanelOpen(true)}
          onMouseLeave={() => setIsColorPanelOpen(false)}
        >
          <div className="p-2 rounded-xl border border-orange-400/40 hover:cursor-pointer hover:bg-neutral-600 hover:border-neutral-700 transition">
            {isColorPanelOpen && <ColorPanel setColor={setColor} />}
            <IoColorPaletteOutline size={25} className="text-neutral-400" />
          </div>
        </div>
      </div>
      <div className="flex-end">
        <button
          onClick={handleSubmit}
          className={`border ${
            projectName.trim().length >= 3
              ? "border-orange-400/60 bg-orange-500/15 hover:cursor-pointer"
              : "border-neutral-400/40"
          } rounded-2xl  p-2  transition `}
        >
          <IoMdArrowRoundForward
            size={30}
            className={`${
              projectName.trim().length >= 3
                ? "text-orange-400"
                : "text-neutral-400"
            }`}
          />
        </button>
        {error && (
          <p className="text-red-400 text-xs mt-4">
            Nazwa projektu min. 3 znaki
          </p>
        )}
      </div>
    </div>
  );
};

export default Projects;
