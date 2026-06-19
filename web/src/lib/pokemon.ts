const sprites = import.meta.glob<string>("/src/assets/pokemon/sprites/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const icons = import.meta.glob<string>("/src/assets/pokemon/icons/*.gif", {
  eager: true,
  query: "?url",
  import: "default",
});

export function getPokemonSpriteUrl(num: number): string {
  const padded = String(num).padStart(3, "0");
  return sprites[`/src/assets/pokemon/sprites/${padded}.png`] ?? "";
}

export function getPokemonIconUrl(num: number): string {
  const padded = String(num).padStart(3, "0");
  return icons[`/src/assets/pokemon/icons/${padded}.gif`] ?? "";
}
