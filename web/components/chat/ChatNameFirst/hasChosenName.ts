import { CurrentUser } from '../../../interfaces/current-user';

// The server sends a zero date ("0001-01-01T00:00:00Z") for users who never changed their name.
export const hasChosenName = (user?: CurrentUser): boolean => {
  const changedAt = new Date(user?.nameChangedAt ?? '').getTime();
  return !Number.isNaN(changedAt) && changedAt > 0;
};
