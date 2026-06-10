import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Chat from "../pages/Chat";
import Pantry from "../pages/Pantry";
import Recipes from "../pages/Recipes";
import Schedule from "../pages/Chores/Schedule";
import Tasks from "../pages/Chores/Tasks";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { activityForPath } from "./activities";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const { pathname } = useLocation();
  const activeActivity = activityForPath(pathname);

  return (
    <div className={styles.layout}>
      <ActivityBar activeActivity={activeActivity} />
      <Sidebar activity={activeActivity} />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/chores" element={<Navigate to="/chores/tasks" replace />} />
          <Route path="/chores/tasks" element={<Tasks />} />
          <Route path="/chores/schedule" element={<Schedule />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
