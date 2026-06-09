import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Pantry from "./pages/Pantry";
import Chat from "./pages/Chat";
import Recipes from "./pages/Recipes";
import { useTheme } from "./theme/useTheme";
import { cn } from "./ui/cn";
import styles from "./App.module.css";

const navItems = [
  { label: "Chat", path: "/" },
  { label: "Recipes", path: "/recipes" },
  { label: "Pantry", path: "/pantry" },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" className={styles.themeToggle} onClick={toggle}>
      {theme === "dark" ? "☀ Light mode" : "🌙 Dark mode"}
    </button>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className={styles.layout}>
        <nav className={styles.sidebar}>
          <div className={styles.logo}>Chef Clyde</div>
          <ul className={styles.nav}>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    cn(styles.navItem, isActive && styles.active)
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </nav>
        <main className={styles.main}>
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
