import SidebarIcons from "./SidebarIcons";
import SidebarPanel from "./Sidebarpanel";

type SidebarProps = {
  isSideBarOpen: boolean;
  setIsSideBarOpen: (value: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  projectId?: number;
};

const Sidebar = ({
  isSideBarOpen,
  setIsSideBarOpen,
  activeView,
  setActiveView,
  projectId,
}: SidebarProps) => {
  return (
    <>
      <SidebarIcons
        activeView={activeView}
        setActiveView={setActiveView}
        isSideBarOpen={isSideBarOpen}
        setIsSideBarOpen={setIsSideBarOpen}
      />

      <SidebarPanel
        isSideBarOpen={isSideBarOpen}
        setIsSideBarOpen={setIsSideBarOpen}
        activeView={activeView}
        projectId={projectId}
      />
    </>
  );
};

export default Sidebar;
