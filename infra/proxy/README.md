# Shared reverse proxy — reach every clone by name

This directory is a **template** for the single, shared reverse proxy that lets
you open each Chef Clyde clone by name instead of by port:

- `http://chef-clyde-gengar.localhost`
- `http://chef-clyde-charmander.localhost`
- `http://chef-clyde-bulbasaur.localhost`

…all on port 80, no port numbers in the URL, no per-clone config to maintain.

## How it works

One [Traefik](https://traefik.io) container owns host port **80** and routes
`<clone>.localhost` to the right backend:

- **Dev-container clones** are auto-discovered. Each container advertises its
  name and port through Traefik labels in
  [`.devcontainer/devcontainer.json`](../../.devcontainer/devcontainer.json) and
  joins the shared `chef-clyde-net` Docker network; Traefik reads those labels
  from the Docker socket and reaches the container directly over that network.
- **The native production clone (gengar)** isn't containerised, so it can't be
  discovered by label. It gets one static route in
  [`dynamic/gengar.yml`](dynamic/gengar.yml) pointing at `host.docker.internal:5173`.

Because routing on a single well-known port requires **one** front door, there is
exactly one proxy. The isolation that matters is still preserved: each clone's
routing comes from *its own* container labels, so changing one clone never affects
another. You essentially never edit the proxy itself.

### Why this lives outside every clone

The proxy is host infrastructure shared by all clones, like production data. So it
runs from `~/chef-clyde-data/proxy/`, **outside** every clone. The files here are a
versioned template; [`sync-and-up.sh`](sync-and-up.sh) copies them to that location
and starts the proxy. Editing these files inside a clone does nothing until you run
the sync — so one clone's edits can't perturb the running proxy or the other clones.

## Usage

Run once before opening dev containers (it also creates the shared network they
join), and again whenever you intend to redeploy the proxy config:

```sh
bash infra/proxy/sync-and-up.sh
```

Stop it with:

```sh
( cd ~/chef-clyde-data/proxy && docker compose down )
```

Inspect discovered routes at the dashboard: <http://localhost:8080>.

## Browser resolution of `*.localhost`

Chrome, Edge, and Firefox resolve `*.localhost` to `127.0.0.1` automatically — no
setup needed. Safari and some CLI tools do **not**. If you need them, add a dnsmasq
rule on macOS:

```sh
echo 'address=/.localhost/127.0.0.1' >> "$(brew --prefix)/etc/dnsmasq.conf"
sudo mkdir -p /etc/resolver
printf 'nameserver 127.0.0.1\n' | sudo tee /etc/resolver/localhost
sudo brew services restart dnsmasq
```
