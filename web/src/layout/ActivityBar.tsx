import { Moon, PanelRight, Sparkles, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAiMotion } from "../ai/useAiMotion";
import { getPokemonSpriteUrl } from "../lib/pokemon";
import { useMeta } from "../lib/useMeta";
import { usePanel } from "../panel/usePanel";
import { useTheme } from "../theme/useTheme";
import { cn } from "../ui/cn";
import { activities, type Activity } from "./activities";
import styles from "./ActivityBar.module.css";

type ActivityBarProps = {
  activeActivity: Activity;
};

export function ActivityBar({ activeActivity }: ActivityBarProps) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { motion, toggle: toggleMotion } = useAiMotion();
  const { open, toggleOpen } = usePanel();
  const { meta } = useMeta();

  const pokemonSpriteUrl = meta ? getPokemonSpriteUrl(meta.pokemonNumber) : null;

  return (
    <nav className={styles.activityBar} aria-label="Activities">
      {activities.map((activity) => {
        const isActive = activity.id === activeActivity.id;
        const isMeta = activity.id === "meta";

        return (
          <button
            key={activity.id}
            type="button"
            className={cn(
              styles.item,
              isActive && styles.active,
              isMeta && styles.pokemonItem,
            )}
            aria-label={activity.label}
            aria-current={isActive ? "page" : undefined}
            title={
              isMeta && meta
                ? `${meta.pokemonName} · ${meta.instanceName}`
                : activity.label
            }
            onClick={() => navigate(activity.navItems[0].path)}
          >
            {isMeta && pokemonSpriteUrl ? (
              <img
                src={pokemonSpriteUrl}
                alt={meta?.pokemonName ?? "pokemon"}
                className={styles.pokemonSprite}
                aria-hidden
              />
            ) : (
              (() => {
                const Icon = activity.icon;
                return <Icon size={22} strokeWidth={2} aria-hidden />;
              })()
            )}
          </button>
        );
      })}
      <button
        type="button"
        className={cn(styles.item, styles.panelToggle, open && styles.active)}
        aria-label={open ? "Hide panel" : "Show panel"}
        aria-pressed={open}
        title={open ? "Hide panel" : "Show panel"}
        onClick={toggleOpen}
      >
        <PanelRight size={22} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={cn(styles.item, motion === "on" && styles.active)}
        aria-label={
          motion === "on" ? "Turn off AI motion" : "Turn on AI motion"
        }
        aria-pressed={motion === "on"}
        title={motion === "on" ? "AI motion: on" : "AI motion: off"}
        onClick={toggleMotion}
      >
        <Sparkles size={22} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={cn(styles.item)}
        aria-label={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        onClick={toggle}
      >
        {theme === "dark" ? (
          <Sun size={22} strokeWidth={2} aria-hidden />
        ) : (
          <Moon size={22} strokeWidth={2} aria-hidden />
        )}
      </button>
    </nav>
  );
}
