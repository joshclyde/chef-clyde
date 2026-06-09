import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import "./App.css";
import Pantry from "./pages/Pantry";
import Chat from "./pages/Chat";
import Recipes from "./pages/Recipes";

const navItems = [
  { label: "Chat", path: "/" },
  { label: "Recipes", path: "/recipes" },
  { label: "Pantry", path: "/pantry" },
];

function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-logo">Chef Clyde</div>
          <ul className="sidebar-nav">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    ["sidebar-nav-item", isActive ? "active" : ""]
                      .join(" ")
                      .trim()
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
