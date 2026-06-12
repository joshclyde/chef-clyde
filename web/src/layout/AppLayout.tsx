import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Pantry from "../pages/Pantry";
import Recipes from "../pages/Recipes";
import Dashboard from "../pages/Chores/Dashboard";
import Tasks from "../pages/Chores/Tasks";
import ScheduleDaily from "../pages/Schedule/Daily";
import ScheduleInstructions from "../pages/Schedule/Instructions";
import ScheduleSaved from "../pages/Schedule/Saved";
import { Panel } from "../panel/Panel";
import { usePanel } from "../panel/usePanel";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { activityForPath } from "./activities";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const { pathname } = useLocation();
  const activeActivity = activityForPath(pathname);
  const { open, position } = usePanel();

  return (
    <div className={styles.layout}>
      <ActivityBar activeActivity={activeActivity} />
      <Sidebar activity={activeActivity} />
      <div className={styles.workspace} data-panel-position={position}>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<Navigate to="/recipes" replace />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/chores" element={<Navigate to="/chores/dashboard" replace />} />
            <Route path="/chores/dashboard" element={<Dashboard />} />
            <Route path="/chores/tasks" element={<Tasks />} />
            <Route path="/schedule" element={<Navigate to="/schedule/daily" replace />} />
            <Route path="/schedule/daily" element={<ScheduleDaily />} />
            <Route path="/schedule/saved" element={<ScheduleSaved />} />
            <Route
              path="/schedule/instructions"
              element={<ScheduleInstructions />}
            />
            <Route path="*" element={<Navigate to="/recipes" replace />} />
          </Routes>
        </main>
        {open && <Panel />}
      </div>
    </div>
  );
}
