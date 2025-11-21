import SidebarIcons from "./SidebarIcons";
import SidebarPanel from "./Sidebarpanel";

type SidebarProps = {
  isSideBarOpen: boolean;
  setIsSideBarOpen: (value: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
};

const Sidebar = ({
  isSideBarOpen,
  setIsSideBarOpen,
  activeView,
  setActiveView,
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
      />
    </>
  );
};

export default Sidebar;
