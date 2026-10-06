import { hasChosenName } from '../components/chat/ChatNameFirst/hasChosenName';

const user = { id: '1', displayName: 'Clever-Fox', displayColor: 0, isModerator: false };

describe('hasChosenName', () => {
  test('no user or no date means no chosen name', () => {
    expect(hasChosenName(undefined)).toBe(false);
    expect(hasChosenName(user)).toBe(false);
  });

  test('the server zero date means no chosen name', () => {
    expect(hasChosenName({ ...user, nameChangedAt: '0001-01-01T00:00:00Z' })).toBe(false);
  });

  test('an invalid date means no chosen name', () => {
    expect(hasChosenName({ ...user, nameChangedAt: 'nope' })).toBe(false);
  });

  test('a Date object works too', () => {
    expect(hasChosenName({ ...user, nameChangedAt: new Date('2026-10-06T12:00:00Z') })).toBe(true);
  });

  test('a real date means the name was chosen', () => {
    expect(hasChosenName({ ...user, nameChangedAt: '2026-10-06T12:00:00.123456789+02:00' })).toBe(
      true,
    );
  });
});
