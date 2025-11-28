import { useState } from "react";
import Navbar from "../components/Navbar";
import SidebarIcons from "../components/sidebar-components/SidebarIcons";
import SidebarPanel from "../components/sidebar-components/Sidebarpanel";
import { Outlet } from "react-router-dom";

const Dashboard = () => {
  const [isSideBarOpen, setIsSideBarOpen] = useState(true);
  const [activeView, setActiveView] = useState("projects");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerProjectsRefresh = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <main className="flex h-screen flex-col gap-4 p-4 overflow-hidden">
      <Navbar />

      <section className="flex flex-1 items-stretch gap-4 overflow-hidden">
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
          onProjectCreated={triggerProjectsRefresh}
        />

        <div className="flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-neutral-200/20 bg-neutral-900 p-3">
            <Outlet
              context={{
                refreshTrigger,
                triggerProjectsRefresh,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
