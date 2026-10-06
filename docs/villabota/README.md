# Villa Bota Owncast

This fork of [Owncast](https://github.com/owncast/owncast) runs the Villa Bota livestream at
<https://live.villabota.be>. The website embeds its chat (`/embed/chat/readwrite/`) and video
(`/embed/video/`).

## What differs from Owncast

- **One week of chat history**: `services/chat/persistence.go` has `maxBacklogHours = 168`
  (Owncast: 2 hours).
- **Choose a name first** in the chat embed, see [chat-name-first.md](chat-name-first.md).
- **Look of the site**: the custom CSS and the appearance colours are stored in the Owncast admin
  (database), not in this repository. [`custom.css`](custom.css) is the copy of the custom CSS.

Everything else is plain Owncast.

## Branches and remotes

The fork's `develop` is Owncast's own `develop` plus the Villa Bota commits. It keeps Owncast's
history, so an update is a normal merge.

| Remote     | Repository                                 |
| ---------- | ------------------------------------------ |
| `origin`   | `github.com/warreac/owncast-vb` (the fork) |
| `upstream` | `github.com/owncast/owncast`               |

The server builds from the fork's `develop`. Do not deploy Owncast's own code there directly:
it misses the changes above.

## Server

Owncast runs on the server in `~/apps/owncast`, a git checkout of the fork's `develop`.
Docker Compose builds the image `owncast:dev` from that folder:

```yaml
services:
  owncast:
    image: owncast:dev
    build:
      context: .
      dockerfile: Dockerfile
    container_name: owncast
    restart: unless-stopped
    networks:
      - pangolin
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Europe/Brussels

  caddy:
    image: caddy:2
    container_name: caddy-owncast
    restart: unless-stopped
    networks:
      - pangolin
    volumes:
      - ./caddy:/etc/caddy:ro
      - caddy_data:/data
      - caddy_config:/config

networks:
  pangolin:
    external: true

volumes:
  caddy_data:
  caddy_config:
```

`docker-compose.yml`, `caddy/`, `data/`, `.dockerignore` and the backups are not in git; they
only exist on the server. `data/` holds the database, settings, custom CSS, chat history and
emoji.

`.dockerignore` keeps runtime data out of the build context:

```
data
data-bckp
caddy
*.tar.gz
docker-compose.yml
.git
```

Without it the build fails with errors like
`failed to solve: error from sender: open .../data-bckp/emoji: permission denied`.

Never run `docker compose pull owncast`: the image is built locally, there is nothing to pull.

## Updating Owncast

Two parts: merge Owncast into the fork on the Mac, then build it on the server.

### 1. On the Mac: merge Owncast into the fork

```sh
cd owncast-vb
git switch develop
git pull
git fetch upstream
git merge upstream/develop
```

Merge conflicts:

- `static/web/` (the built web app): take Owncast's version, it is rebuilt below.
  `git checkout --theirs static/web && git add static/web`
- Our own files (see "What differs"): keep both changes. Owncast sometimes moves files; the chat
  history setting was in `core/chat/persistence.go` before it moved to
  `services/chat/persistence.go`.

Check that our changes survived:

```sh
grep -n 'maxBacklogHours' services/chat/persistence.go   # 168
```

Install, test and rebuild the web app. The web app wants the npm version from `engines.npm` in
`web/package.json` (11.6.2 at the moment):

```sh
cd web
npx -y npm@11.6.2 ci
npx jest
npx tsc --noEmit
cd ..
build/web/bundleWeb.sh --offline
git add static/web
git commit -m "Bundle embedded web app"
```

Try it locally before pushing:

```sh
docker build -t owncast-vb .
docker run --rm -p 8080:8080 -p 1935:1935 owncast-vb
```

Open <http://localhost:8080/embed/chat/readwrite/> and go through the checks in
[chat-name-first.md](chat-name-first.md). The chat only opens while a stream is live; stream a test
picture with:

```sh
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=440 \
  -c:v libx264 -preset veryfast -pix_fmt yuv420p -g 60 -c:a aac \
  -f flv rtmp://localhost:1935/live/abc123
```

To see it the way it looks on the site, copy the custom CSS and the appearance colours (Admin ›
Appearance) from live into the local admin (`admin` / `abc123`).

Then push: `git push origin develop`.

### 2. On the server: build and restart

```sh
ssh <user>@<server>
cd ~/apps/owncast

# Keep the running image for a quick rollback.
docker tag owncast:dev owncast:before-update

# Get the new code and build it while the old version keeps running.
git pull
docker compose build --no-cache owncast

# Short downtime: stop, back up, start the new version.
docker compose stop owncast
sudo tar -czf owncast-data-backup-$(date +%F-%H%M).tar.gz data caddy docker-compose.yml
docker compose up -d owncast

docker compose ps
docker compose logs --tail=100 owncast
```

Good signs in the logs:

```
Web server is listening on port 8080.
Inbound stream connected
Processing video using codec x264
```

The last two only appear once a stream starts.

Then check the site: the chat embed in a private window (see the checks in
[chat-name-first.md](chat-name-first.md)), the video embed, and that the chat history of the week
is still there.

New Owncast versions can migrate the database. There is no way back without the backup.

**Rollback:**

```sh
docker compose stop owncast
sudo rm -rf data && sudo tar -xzf owncast-data-backup-<date>.tar.gz data
docker tag owncast:before-update owncast:dev
docker compose up -d --no-build owncast
```

**Cleanup**, once the new version works:

```sh
docker image rm owncast:before-update
docker image prune
```

Remove old `owncast-data-backup-*.tar.gz` files now and then; keep at least the latest.

### Is the server up to date?

The Owncast admin shows `vdev-docker`, not a version number. Check git instead:

```sh
cd ~/apps/owncast
git fetch
git status
git log -1 --oneline
```

Expected: `Your branch is up to date with 'origin/develop'.` and no modified files.

## Custom CSS

Admin › Configuration › General › Custom CSS. Keep [`custom.css`](custom.css) in this
repository in sync with what is in the admin.

The rules find Owncast's elements by their generated class names, for example
`[class*='ChatUserMessage'][class*='_root']`. Owncast changes those names now and then (the
format changed with Owncast 0.4), so after each update check:

- the chat embed: messages without boxes, a thin coloured line on the left, dots behind the message
  box, the emoji window black without a white frame;
- the video embed: no status bar under the video;
- the offline video embed: solid black, only the offline message.

If something looks off, open the browser's inspector on that element and update the class name
in the rule.

## Caddy

Caddy is a normal image and is updated separately:

```sh
docker compose pull caddy
docker compose up -d caddy
docker compose logs --tail=50 caddy
```

## History

- **2026-05-21**: live on Owncast `develop` of 19 May 2026, with the 168-hour chat history as a
  hand-made change on the server.
- **2026-10-06**: moved to this fork: Owncast `develop` of 3 Oct 2026 (labelled 0.4.0-dev, after the
  v0.3.0 release), the 168-hour chat history as a commit, and "choose a name first" in the chat
  embed.
