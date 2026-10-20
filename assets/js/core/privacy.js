export const LEVELS = ['everyone', 'friends', 'nobody'];
export const PHOTO_LEVELS = ['public', 'everyone', 'friends', 'nobody'];
export const REQUEST_LEVELS = ['everyone', 'nobody'];
export const FIELDS = ['photo', 'stats', 'look'];

export const defaultPrivacy = () => ({ photo: 'public', stats: 'everyone', look: 'everyone', requests: 'everyone' });

export function cleanPrivacy(raw) {
  const base = defaultPrivacy();
  const data = raw && typeof raw === 'object' ? raw : {};
  for (const key of FIELDS) if ((key === 'photo' ? PHOTO_LEVELS : LEVELS).includes(data[key])) base[key] = data[key];
  if (REQUEST_LEVELS.includes(data.requests)) base.requests = data.requests;
  return base;
}

export const canSee = (level, relation) => relation === 'self' || level === 'public' || level === 'everyone' || (level === 'friends' && relation === 'friend');