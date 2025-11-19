import { useState } from "react";
import Navbar from "../components/Navbar";
import SidebarIcons from "../components/SidebarIcons";
import SidebarPanel from "../components/SidebarPanel";
import { Outlet } from "react-router-dom";

const Dashboard = () => {
  const [isSideBarOpen, setIsSideBarOpen] = useState(true);
  const [activeView, setActiveView] = useState("projects");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6">
      <Navbar />

      <section className="flex flex-1 items-stretch gap-6">
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
          onProjectCreated={() => setRefreshTrigger((prev) => prev + 1)}
        />

        <div className="flex-1">
          <div className="h-full min-h-full rounded-4xl border border-neutral-200/20 bg-neutral-900 p-6">
            <Outlet context={{ refreshTrigger }} />
          </div>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
