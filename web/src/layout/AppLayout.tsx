import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Dashboard from "../pages/Chores/Dashboard";
import Tasks from "../pages/Chores/Tasks";
import HobbiesDashboard from "../pages/Hobbies/Dashboard";
import Hobbies from "../pages/Hobbies/Hobbies";
import Meta from "../pages/Meta/Meta";
import Pantry from "../pages/Pantry";
import Recipes from "../pages/Recipes";
import RoutinesBreakdown from "../pages/Routines/Dashboard";
import Routines from "../pages/Routines/Routines";
import ScheduleDaily from "../pages/Schedule/Daily";
import ScheduleInstructions from "../pages/Schedule/Instructions";
import ScheduleSaved from "../pages/Schedule/Saved";
import Todos from "../pages/Todos/Todos";
import { Panel } from "../panel/Panel";
import { usePanel } from "../panel/usePanel";
import { activityForPath } from "./activities";
import { ActivityBar } from "./ActivityBar";
import styles from "./AppLayout.module.css";
import { Sidebar } from "./Sidebar";

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
            <Route path="/meta" element={<Meta />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route
              path="/chores"
              element={<Navigate to="/chores/dashboard" replace />}
            />
            <Route path="/chores/dashboard" element={<Dashboard />} />
            <Route path="/chores/tasks" element={<Tasks />} />
            <Route
              path="/hobbies"
              element={<Navigate to="/hobbies/dashboard" replace />}
            />
            <Route path="/hobbies/dashboard" element={<HobbiesDashboard />} />
            <Route path="/hobbies/list" element={<Hobbies />} />
            <Route
              path="/routines"
              element={<Navigate to="/routines/breakdown" replace />}
            />
            <Route path="/routines/breakdown" element={<RoutinesBreakdown />} />
            <Route path="/routines/manage" element={<Routines />} />
            <Route path="/todos" element={<Todos />} />
            <Route
              path="/schedule"
              element={<Navigate to="/schedule/daily" replace />}
            />
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
