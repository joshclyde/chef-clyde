import { execSync } from "child_process";
import { Router } from "express";
import os from "os";
import path from "path";

const router = Router();

const POKEMON_NAMES = [
  "bulbasaur", "ivysaur", "venusaur", "charmander", "charmeleon",
  "charizard", "squirtle", "wartortle", "blastoise", "caterpie",
  "metapod", "butterfree", "weedle", "kakuna", "beedrill",
  "pidgey", "pidgeotto", "pidgeot", "rattata", "raticate",
  "spearow", "fearow", "ekans", "arbok", "pikachu",
  "raichu", "sandshrew", "sandslash", "nidoran-f", "nidorina",
  "nidoqueen", "nidoran-m", "nidorino", "nidoking", "clefairy",
  "clefable", "vulpix", "ninetales", "jigglypuff", "wigglytuff",
  "zubat", "golbat", "oddish", "gloom", "vileplume",
  "paras", "parasect", "venonat", "venomoth", "diglett",
  "dugtrio", "meowth", "persian", "psyduck", "golduck",
  "mankey", "primeape", "growlithe", "arcanine", "poliwag",
  "poliwhirl", "poliwrath", "abra", "kadabra", "alakazam",
  "machop", "machoke", "machamp", "bellsprout", "weepinbell",
  "victreebel", "tentacool", "tentacruel", "geodude", "graveler",
  "golem", "ponyta", "rapidash", "slowpoke", "slowbro",
  "magnemite", "magneton", "farfetchd", "doduo", "dodrio",
  "seel", "dewgong", "grimer", "muk", "shellder",
  "cloyster", "gastly", "haunter", "gengar", "onix",
  "drowzee", "hypno", "krabby", "kingler", "voltorb",
  "electrode", "exeggcute", "exeggutor", "cubone", "marowak",
  "hitmonlee", "hitmonchan", "lickitung", "koffing", "weezing",
  "rhyhorn", "rhydon", "chansey", "tangela", "kangaskhan",
  "horsea", "seadra", "goldeen", "seaking", "staryu",
  "starmie", "mr-mime", "scyther", "jynx", "electabuzz",
  "magmar", "pinsir", "tauros", "magikarp", "gyarados",
  "lapras", "ditto", "eevee", "vaporeon", "jolteon",
  "flareon", "porygon", "omanyte", "omastar", "kabuto",
  "kabutops", "aerodactyl", "snorlax", "articuno", "zapdos",
  "moltres", "dratini", "dragonair", "dragonite", "mewtwo",
  "mew",
];

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pokemonFromName(instanceName: string): { number: number; name: string } {
  const normalized = instanceName.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const directIdx = POKEMON_NAMES.indexOf(normalized);
  if (directIdx >= 0) {
    return { number: directIdx + 1, name: POKEMON_NAMES[directIdx] };
  }
  // Try matching if the instance name contains a pokemon name
  for (let i = 0; i < POKEMON_NAMES.length; i++) {
    if (normalized.includes(POKEMON_NAMES[i])) {
      return { number: i + 1, name: POKEMON_NAMES[i] };
    }
  }
  // Fallback: hash-based assignment
  const idx = djb2Hash(instanceName) % 151;
  return { number: idx + 1, name: POKEMON_NAMES[idx] };
}

function getGitBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
  } catch {
    return "unknown";
  }
}

function getInstanceName(): string {
  if (process.env.INSTANCE_NAME) return process.env.INSTANCE_NAME;
  const dbPath = process.env.DB_PATH ?? "";
  if (dbPath) {
    const parent = path.basename(path.dirname(dbPath));
    if (parent && parent !== "." && parent !== "/") return parent;
  }
  return os.hostname();
}

router.get("/", (_req, res) => {
  const instanceName = getInstanceName();
  const { number: pokemonNumber, name: pokemonName } = pokemonFromName(instanceName);

  res.json({
    instanceName,
    pokemonNumber,
    pokemonName,
    branch: getGitBranch(),
    dbPath: process.env.DB_PATH ?? "unknown",
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? "development",
  });
});

export default router;
