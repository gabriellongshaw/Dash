export const LEVELS = ['everyone', 'friends', 'nobody'];
export const PHOTO_LEVELS = ['public', 'signedin', 'friends', 'nobody'];
export const PROFILE_LEVELS = ['everyone', 'signedin', 'friends'];
export const REQUEST_LEVELS = ['everyone', 'nobody'];
export const FIELDS = ['photo', 'stats', 'look', 'profile'];

export const levelsFor = key => (key === 'photo' ? PHOTO_LEVELS : key === 'profile' ? PROFILE_LEVELS : LEVELS);

export const defaultPrivacy = () => ({ photo: 'public', stats: 'everyone', look: 'everyone', profile: 'everyone', requests: 'everyone' });

export function cleanPrivacy(raw) {
  const base = defaultPrivacy();
  const data = raw && typeof raw === 'object' ? raw : {};
  for (const key of FIELDS) if (levelsFor(key).includes(data[key])) base[key] = data[key];
  if (data.photo === 'everyone') base.photo = 'signedin';
  if (REQUEST_LEVELS.includes(data.requests)) base.requests = data.requests;
  return base;
}

export const canSee = (level, relation) =>
  relation === 'self' || level === 'public' || level === 'everyone' || (level === 'signedin' && relation !== 'guest') || (level === 'friends' && relation === 'friend');