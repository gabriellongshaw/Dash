export const MAX_GIFT_COINS = 1000;

export const MESSAGES = {
  taken: 'That username is taken.',
  username: 'Use 3 to 16 lowercase letters, numbers or underscores.',
  cooldown: 'You can only change your username once a day.',
  'no-user': 'That player could not be found.',
  self: 'That is your own username.',
  already: 'You are already friends.',
  pending: 'You already sent them a request.',
  full: 'Your friends list is full.',
  'target-full': 'Their friends list is full.',
  'too-many': 'You have too many pending requests.',
  'target-busy': 'They have too many pending requests.',
  'no-username': 'Choose a username first.',
  coins: 'Not enough coins.',
  owned: 'They already own that item.',
  'not-friends': 'You are not friends yet.',
  amount: `Gifts can be up to ${MAX_GIFT_COINS} coins.`,
  empty: 'Choose coins or an item to send.',
  'requests-off': 'This player is not accepting friend requests.',
  'you-blocked': 'You blocked this player. Unblock them first.',
  'too-many-favourites': 'You can favourite up to 10 friends.',
  'too-many-blocked': 'Your blocked list is full.',
  privacy: 'That setting is not valid.'
};

export const messageFor = e => MESSAGES[e && e.code] || `Something went wrong${e && e.code ? ` (${e.code})` : ''}. Try again.`;

export function button(label, className, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  el.addEventListener('click', onClick);
  return el;
}