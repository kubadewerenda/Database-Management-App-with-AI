import type { ReactNode } from "react";
import { FaFolderOpen, FaDatabase } from "react-icons/fa";
import { IoSettings } from "react-icons/io5";

type SidebarIconsProps = {
  activeView: string;
  setActiveView: (view: string) => void;
  isSideBarOpen: boolean;
  setIsSideBarOpen: (value: boolean) => void;
};

type SidebarIconConfig = {
  id: string;
  label: string;
  icon: ReactNode;
};

const icons: SidebarIconConfig[] = [
  { id: "projects", label: "Projekty", icon: <FaFolderOpen size={20} /> },
  { id: "settings", label: "Ustawienia", icon: <IoSettings size={20} /> },
  { id: "queries", label: "Zapytania", icon: <FaDatabase size={20} /> },
];

const SidebarIcons = ({
  activeView,
  setActiveView,
  isSideBarOpen,
  setIsSideBarOpen,
}: SidebarIconsProps) => {
  const handleClick = (id: string) => {
    setActiveView(id);
    if (!isSideBarOpen) {
      setIsSideBarOpen(true);
    }
  };

  return (
    <aside className="flex w-20 flex-col items-center justify-center gap-4 self-start rounded-4xl border border-neutral-600 bg-neutral-900/70 p-4 shadow-xl">
      {icons.map(({ id, label, icon }) => {
        const isActive = activeView === id;

        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-pressed={isActive}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 ${
              isActive
                ? "border-orange-400/60 bg-orange-500/15 text-orange-300"
                : "border-transparent text-neutral-400 hover:text-orange-300 hover:bg-neutral-800/70"
            }`}
            onClick={() => handleClick(id)}
          >
            {icon}
          </button>
        );
      })}
    </aside>
  );
};

export default SidebarIcons;
