# Plan: Owncast chat, name first

Separate project: [warreac/owncast-vb](https://github.com/warreac/owncast-vb), a fork of Owncast (develop).
The website embeds its chat at `https://live.villabota.be/embed/chat/readwrite/` (Instellingen › Chat).
This repository does not change.

## Base: Owncast develop `cd64bdf44f` (2026-10-03, 0.4.0-dev)

The fork was a squash of upstream develop `c774d8bffa` (2025-10-21, 0.2.3). Live
(`live.villabota.be`) already runs a newer develop build: its `/api/config` has
`chatRequireAuthentication` (added 2026-01-28) but no `pluginStyles` (added 2026-06-19).
Deploying the old fork would downgrade live by months, so the feature now sits on upstream develop
`cd64bdf44f`. That includes v0.2.4, v0.2.5, v0.3.0 and the security fixes after v0.3.0
(chat, IndieAuth, ActivityPub, webhooks, HLS uploads), and a fixed forbidden-name check.

What changed upstream that matters here:

- Web state moved from Recoil to Jotai (`useAtomValue`).
- The readwrite embed is a flex column of `100dvh`, so the name form takes its own height and never
  falls off the bottom.
- Next.js 14 → 16 changed the CSS class names (see "Custom CSS").
- The web app needs npm 11.6.2: `npx -y npm@11.6.2 ci` in `web/`.

## Goal

1. The chat header uses the dotted background, like the rest of the chat.
2. A new chatter first chooses a name. The message box appears after that.

## Step 1: header (no build)

The live Owncast custom CSS (Admin › Configuration › General › Custom CSS) contains
`.global-header { background: #000; }`. Replace it with:

```css
.global-header {
  background: transparent !important;
}
```

Check the embed. If the header still is solid, also add `.global-header [class*='Header_header'] { background: transparent !important; }`.

## Step 2: name first (fork change)

Owncast already stores when a chatter changed their name (`nameChangedAt`) and sends it to the
browser on every connect (`CONNECTED_USER_INFO`). The web app threw it away. We keep it:

- No `nameChangedAt` (or the server zero date `0001-01-01…`): show the messages with
  `showInput={false}` and a name form under them.
- A real date: show the normal `ChatContainer` with the message box.

Files in `web/`:

- `interfaces/current-user.ts`: optional `nameChangedAt`.
- `components/stores/eventhandlers/connected-client-info-handler.ts`: copy `nameChangedAt` from the server user.
- `components/stores/eventhandlers/handleNameChangeEvent.tsx`: set `nameChangedAt` when the server
  confirms our own name change. The server only sends this event when it accepts the name.
- New `components/chat/ChatNameFirst/ChatNameFirst.tsx` + `.module.scss`: one row with the placeholder
  "Kies een naam om mee te chatten" and a "Kies naam" button. Same structure and theme variables as the
  message box (`ChatTextField`), so both look alike under any appearance settings. Reuses `validateDisplayName` and
  `websocketService.send({ type: MessageType.NAME_CHANGE, newName })`.
- New `components/chat/ChatNameFirst/hasChosenName.ts`: the date check, in its own file so Jest can
  test it without loading antd and SCSS.
- `pages/embed/chat/readwrite/index.tsx`: switch between the form and the message box, and hide the
  "X is now known as Y" messages (`NAME_CHANGE`), since every chatter now picks a name first.
- Test: `tests/chatNameFirst.test.ts`.

Why not a `localStorage` flag: it would be set before the server accepts the name, so a refused name
would still unlock the chat. It also could not tell new chatters from chatters who chose a name
before the update. With `nameChangedAt`, those chatters skip the form, so no "Doorgaan als" button.

Keep the change in these files, so an Owncast update stays a small re-apply (see "Commit plan").

## Custom CSS

The full custom CSS is in `docs/owncast-custom.css` (Admin › Configuration › General › Custom CSS).

Owncast class names contain the component file and class name, but the format changed:
`ChatUserMessage_root__x1y2z` (live now) became `ChatUserMessage-module-scss-module__x1y2z__root`.
Every rule therefore matches on two parts, e.g. `[class*='ChatUserMessage'][class*='_root']`, which
fits both. Checked on both builds: every rule matches the same elements before and after the update,
so the CSS can go live before the deploy.

Other changes against the CSS on live:

- `#chat-input, #chat-name-first { background: transparent }`: the message box and the name form
  no longer draw their own strip, the dots run through to the bottom.
- Dropped `ChatSystemMessage_root`, `ChatModeratorNotification_root` and `ChatSocialMessage_root`:
  those classes never existed, so the rules did nothing.

The look of the fields comes from the appearance settings (Admin › Appearance), not from the custom
CSS: on live the chat background is `#000` and the corners are `0px`. Test locally with the same
values (copy `appearanceVariables` from `https://live.villabota.be/api/config`), otherwise the
default theme shows a dark blue strip and rounded corners that live does not have.

## Server (live)

The server folder `~/apps/owncast` is a git clone of upstream Owncast (`origin`), branch
`develop` at 19 May 2026 (`34a3f85cdd`, rewritten upstream since; same as `da13dabdb6`).
`docker-compose.yml` builds `owncast:dev` from that folder; data is the bind mount `./data`.
Untracked and kept as they are: `docker-compose.yml`, `caddy/`, `data/`, `data-bckp/`,
`.dockerignore`, the backups. Upstream develop has no files with those names.

Live had one hand-made change: `core/chat/persistence.go` `maxBacklogHours = 168` (chat history
one week instead of 2 hours). On develop the file is `services/chat/persistence.go`; the change is
part of this fork now, so the `git stash` steps in the old update guide are no longer needed.

## Commits

Branch `villabota` in `warreac/owncast-vb`, on top of upstream develop `cd64bdf44f` (keeps
Owncast's own history, so updates are a merge and the server can just `git checkout`):

1. `feat(chat): keep one week of chat history` (`services/chat/persistence.go`).
2. `feat(web): choose a name before chatting in the chat embed` (the feature files, docs).
3. `Bundle embedded web app` (`static/web`, built with `build/web/bundleWeb.sh --offline`).

Push the branch.

## Deploy (on the server)

The new version migrates the database. There is no way back without the backup below.

```sh
cd ~/apps/owncast

# 1. Keep the current image for a quick rollback.
docker tag owncast:dev owncast:before-villabota

# 2. Drop the hand-made change (it is in the fork now) and switch to the fork.
git checkout -- core/chat/persistence.go
git remote add vb https://github.com/warreac/owncast-vb.git
git fetch vb
git switch --track vb/villabota
grep -n 'maxBacklogHours' services/chat/persistence.go   # expect 168

# 3. Build while the old version keeps running.
docker compose build --no-cache owncast

# 4. Short downtime: stop, back up, start the new version.
docker compose stop owncast
sudo tar -czf owncast-data-backup-$(date +%F-%H%M).tar.gz data caddy docker-compose.yml
docker compose up -d owncast
docker compose logs --tail=100 owncast   # "Web server is listening on port 8080."
```

Paste `docs/owncast-custom.css` into the admin before or right after step 4.

Rollback: `docker compose stop owncast`, restore `data` from the tarball
(`sudo rm -rf data && sudo tar -xzf owncast-data-backup-<stamp>.tar.gz`), then
`docker tag owncast:before-villabota owncast:dev && docker compose up -d --no-build owncast`.

## Later Owncast updates

On the Mac, in the fork: `git fetch https://github.com/owncast/owncast.git develop`, merge it into
`villabota`, rebuild `static/web` (conflicts there: just rebuild), run the checks below, push.
On the server: `git pull`, then steps 1, 3 and 4 above. Do not run `docker compose pull owncast`.

## Checks

- Desktop and phone: a new browser (no stored token) sees the name form and no message box.
- After a valid name: the message box appears, also after a reload.
- An invalid name (empty, too long) shows the validation message under the form.
- A taken or forbidden name: the server explains it in the chat list, and the form stays.
- A chatter who changed their name before the update goes straight to the message box.
- The header shows the dots.
- Choosing a name shows no "X is now known as Y" line in the embed.
- A forbidden name (e.g. `admin`) keeps the form, also after a reload.
- Chat messages from earlier in the week are still there after a restart (168 hours).
- The message box and the name form have no strip of their own; no divider line above them.
- The readonly embed and the normal Owncast page do not change.

## Open questions

- Colour picker in the name form: no.
- Moderators skip the name form: no, they also choose a name.
