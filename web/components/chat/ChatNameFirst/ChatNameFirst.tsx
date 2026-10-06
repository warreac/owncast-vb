import { FC, FormEvent, useState } from 'react';
import { useAtomValue } from 'jotai';
import { MessageType } from '../../../interfaces/socket-events';
import { websocketServiceAtom, currentUserAtom } from '../../stores/ClientConfigStore';
import { validateDisplayName } from '../../../utils/displayNameValidation';
import styles from './ChatNameFirst.module.scss';

const characterLimit = 30;
const label = 'Kies een naam om mee te chatten';

// Shown in place of the message box until the chatter has chosen a name. It uses the same
// structure and theme variables as ChatTextField, so both look alike under any appearance.
export const ChatNameFirst: FC = () => {
  const currentUser = useAtomValue(currentUserAtom);
  const websocketService = useAtomValue(websocketServiceAtom);
  const [newName, setNewName] = useState<string>('');

  if (!currentUser) {
    return null;
  }

  const validation = validateDisplayName(newName, currentUser.displayName, characterLimit);
  const saveEnabled = validation.isValid && websocketService?.isConnected();

  // The server answers with a NAME_CHANGE event when it accepts the name. That sets
  // nameChangedAt and hides this form. A refused name is explained in the chat above.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!saveEnabled) return;
    websocketService.send({ type: MessageType.NAME_CHANGE, newName: validation.trimmedName });
  };

  return (
    <div id="chat-name-first" className={styles.root}>
      <form className={styles.inputWrap} onSubmit={handleSubmit}>
        <input
          id="chat-name-first-field"
          className={styles.field}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder={label}
          aria-label={label}
          maxLength={characterLimit}
          autoComplete="nickname"
        />
        <button type="submit" className={styles.button} disabled={!saveEnabled}>
          Kies naam
        </button>
      </form>
      {newName && !validation.isValid && validation.errorMessage && (
        <div className={styles.error}>{validation.errorMessage}</div>
      )}
    </div>
  );
};
