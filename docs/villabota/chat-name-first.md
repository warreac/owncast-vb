# Chat: choose a name first

In the chat embed (`/embed/chat/readwrite/`) a new chatter first chooses a name. The message box
appears after the server has accepted that name.

## How it works

Owncast stores when a chatter last changed their name (`nameChangedAt`) and sends it with the
chatter's user on every connect. Upstream's web app dropped it; we keep it:

- No `nameChangedAt`, or the server's empty date `0001-01-01T00:00:00Z`: the embed shows the
  messages with a name form below them instead of the message box.
- A real date: the normal message box.

The form sends Owncast's own `NAME_CHANGE` message. The server answers in one of two ways:

- **Accepted:** a `NAME_CHANGE` event and a fresh user with `nameChangedAt` set. The form is replaced
  by the message box, also after a reload.
- **Refused** (forbidden or taken name): an explanation in the chat list and the unchanged user. The
  form stays.

Chatters who changed their name before this feature have the date already, so they go straight to
the message box. Nothing is kept in `localStorage`: a refused name can't unlock the chat, and a new
browser or device works the same.

The embed also hides the "X is now known as Y" lines, since every chatter now picks a name first.
The normal Owncast page still shows them.

## Files

All in `web/`:

- `interfaces/current-user.ts`: optional `nameChangedAt`.
- `components/stores/eventhandlers/connected-client-info-handler.ts`: keeps `nameChangedAt` from the
  server.
- `components/stores/eventhandlers/handleNameChangeEvent.tsx`: sets `nameChangedAt` when the
  server accepts our own new name.
- `components/chat/ChatNameFirst/ChatNameFirst.tsx` + `.module.scss`: one row with the placeholder
  "Kies een naam om mee te chatten" and a "Kies naam" button. Same structure and theme variables
  as the message box (`ChatTextField`), so both look alike under any appearance settings. Reuses
  `validateDisplayName`.
- `components/chat/ChatNameFirst/hasChosenName.ts`: the date check, in its own file so Jest can
  test it without antd and SCSS.
- `pages/embed/chat/readwrite/index.tsx`: switches between the form and the message box, hides
  `NAME_CHANGE` messages.
- `tests/chatNameFirst.test.ts`.

Keep the change in these files, so upstream merges stay easy.

Styling for the site (transparent strip behind the form and the message box) is in
[`custom.css`](custom.css). The form has fixed ids: `#chat-name-first`, `#chat-name-first-field`.

## Checks

After an Owncast update, in a private window on the chat embed, with a stream running:

- A new visitor sees the name form and no message box (desktop and phone).
- An empty name or only spaces keeps "Kies naam" disabled.
- A valid name shows the message box, also after a reload. No "X is now known as Y" line.
- A forbidden name (e.g. `admin`) keeps the form, also after a reload; the server explains why in
  the chat.
- The form and the message box sit at the bottom, with the dots behind them and no divider line.
- The readonly embed and the normal Owncast page are unchanged.
