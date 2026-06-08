import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import "./App.css";
import Pantry from "./pages/Pantry";
import Recipes from "./pages/Recipes";
import SavedRecipes from "./pages/SavedRecipes";

const navItems = [
  { label: "Recipes", path: "/" },
  { label: "Saved Recipes", path: "/saved-recipes" },
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
            <Route path="/" element={<Recipes />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/saved-recipes" element={<SavedRecipes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
