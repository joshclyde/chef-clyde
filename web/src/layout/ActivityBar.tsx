import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getPokemonSpriteUrl } from "../lib/pokemon";
import { useMeta } from "../lib/useMeta";
import { cn } from "../ui/cn";
import { activities, type Activity } from "./activities";
import styles from "./ActivityBar.module.css";

type ActivityBarProps = {
  activeActivity: Activity;
};

export function ActivityBar({ activeActivity }: ActivityBarProps) {
  const navigate = useNavigate();
  const { meta } = useMeta();

  const pokemonSpriteUrl = meta ? getPokemonSpriteUrl(meta.pokemonNumber) : null;

  return (
    <nav className={styles.activityBar} aria-label="Activities">
      {activities
        .filter((a) => a.id !== "settings")
        .map((activity) => {
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
        className={cn(
          styles.item,
          styles.settingsItem,
          activeActivity.id === "settings" && styles.active,
        )}
        aria-label="Settings"
        aria-current={activeActivity.id === "settings" ? "page" : undefined}
        title="Settings"
        onClick={() => navigate("/settings")}
      >
        <Settings size={22} strokeWidth={2} aria-hidden />
      </button>
    </nav>
  );
}
