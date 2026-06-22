import { BrowserRouter, useLocation } from "react-router-dom";

import { AppLayout } from "./layout";
import ScheduleToday from "./pages/Schedule/Today";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

/**
 * The V2 "Today" schedule is a mobile-first page that hides the persistent app
 * chrome behind a menu button, so it renders outside AppLayout: on
 * /schedule/today we show it full-screen, otherwise the standard layout (which
 * owns every other route).
 */
function AppRoutes() {
  const { pathname } = useLocation();
  if (pathname === "/schedule/today") return <ScheduleToday />;
  return <AppLayout />;
}

export default App;
