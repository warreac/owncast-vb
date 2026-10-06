import { ConnectedClientInfoEvent } from '../../../interfaces/socket-events';

export function handleConnectedClientInfoMessage(
  message: ConnectedClientInfoEvent,
  setChatAuthenticated: (boolean) => void,
  setCurrentUser: (CurrentUser) => void,
) {
  const { user } = message;
  const { id, displayName, displayColor, scopes, authenticated, nameChangedAt } = user;
  setChatAuthenticated(authenticated);

  setCurrentUser({
    id: id.toString(),
    displayName,
    displayColor,
    isModerator: scopes?.includes('MODERATOR'),
    nameChangedAt,
  });
}
