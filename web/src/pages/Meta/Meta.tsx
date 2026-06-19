import { getPokemonSpriteUrl } from "../../lib/pokemon";
import { useMeta } from "../../lib/useMeta";
import { Heading, Stack, Text } from "../../ui";
import styles from "./Meta.module.css";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export default function Meta() {
  const { meta, loading, error } = useMeta();

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Instance</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  if (error || !meta) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Instance</Heading>
        <Text variant="danger">{error ?? "Unknown error"}</Text>
      </Stack>
    );
  }

  const spriteUrl = getPokemonSpriteUrl(meta.pokemonNumber);
  const paddedNum = String(meta.pokemonNumber).padStart(3, "0");

  return (
    <Stack gap="xl" className={styles.page}>
      <Heading level={1}>Instance</Heading>

      <div className={styles.pokemon}>
        {spriteUrl && (
          <img
            src={spriteUrl}
            alt={meta.pokemonName}
            className={styles.sprite}
          />
        )}
        <div className={styles.pokemonInfo}>
          <span className={styles.pokemonName}>{meta.pokemonName}</span>
          <span className={styles.pokemonNum}>#{paddedNum}</span>
        </div>
      </div>

      <div className={styles.table}>
        <MetaRow label="Instance" value={meta.instanceName} />
        <MetaRow label="Branch" value={meta.branch} />
        <MetaRow label="Environment" value={meta.environment} />
        <MetaRow label="Database" value={meta.dbPath} />
        <MetaRow label="Node" value={meta.nodeVersion} />
      </div>
    </Stack>
  );
}
