import { NameChangeEvent } from '../../../interfaces/socket-events';
import { CurrentUser } from '../../../interfaces/current-user';

export function handleNameChangeEvent(
  message: NameChangeEvent,
  setChatMessages,
  setCurrentUser: (_: (_: CurrentUser) => CurrentUser) => void,
) {
  setCurrentUser(currentUser =>
    currentUser.id === message.user.id
      ? {
          ...currentUser,
          displayName: message.user.displayName,
          nameChangedAt: new Date().toISOString(),
        }
      : currentUser,
  );
  setChatMessages(currentState => [...currentState, message]);
}
