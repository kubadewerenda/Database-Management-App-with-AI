// SidebarPanel.tsx
import type { ReactNode } from "react";
import { IoClose } from "react-icons/io5";
import SavedQueries from "../sidebarOptions-components/SavedQueries";
import Projects from "../sidebarOptions-components/Projects";
import Settings from "../sidebarOptions-components/Settings";

type SidebarPanelProps = {
  isSideBarOpen: boolean;
  setIsSideBarOpen: (value: boolean) => void;
  activeView: string;
  onProjectCreated?: () => void;
  projectId?: number;
};

const SidebarPanel = ({
  isSideBarOpen,
  setIsSideBarOpen,
  activeView,
  onProjectCreated,
  projectId,
}: SidebarPanelProps) => {
  if (!isSideBarOpen) return null;

  const views: Record<string, ReactNode> = {
    projects: <Projects onProjectCreated={onProjectCreated} />,
    settings: <Settings />,
    queries: <SavedQueries projectId={projectId} />,
  };

  const panelContent = views[activeView] ?? views.projects;

  return (
    <aside className="relative flex w-[320px] shrink-0 flex-col self-start rounded-2xl border border-neutral-600/70 bg-neutral-900/80 p-6 shadow-xl">
      {panelContent}

      <button
        type="button"
        aria-label="Zamknij panel boczny"
        className="absolute top-3 right-3 rounded-full p-1 text-neutral-400 transition hover:text-orange-400 hover:bg-neutral-700/60"
        onClick={() => setIsSideBarOpen(false)}
      >
        <IoClose size={20} />
      </button>
    </aside>
  );
};

export default SidebarPanel;
