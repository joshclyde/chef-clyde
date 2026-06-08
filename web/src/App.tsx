import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom"
import "./App.css"
import Dashboard from "./pages/Dashboard"
import MealPlan from "./pages/MealPlan"
import Recipes from "./pages/Recipes"
import Settings from "./pages/Settings"
import ShoppingList from "./pages/ShoppingList"

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Recipes", path: "/recipes" },
  { label: "Meal Plan", path: "/meal-plan" },
  { label: "Shopping List", path: "/shopping-list" },
  { label: "Settings", path: "/settings" },
]

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
                    ["sidebar-nav-item", isActive ? "active" : ""].join(" ").trim()
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/meal-plan" element={<MealPlan />} />
            <Route path="/shopping-list" element={<ShoppingList />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
