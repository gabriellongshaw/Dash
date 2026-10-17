const COLOURS = ['#10b981', '#0891b2', '#6366f1', '#a855f7', '#db2777', '#d97706', '#dc2626', '#65a30d'];

export function colourFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLOURS[h % COLOURS.length];
}

export function makeAvatar(person, size = 'md') {
  const name = person.username || '?';
  if (person.photo) {
    const img = document.createElement('img');
    img.className = `friend-avatar ${size}`;
    img.src = person.photo;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.replaceWith(makeAvatar({ ...person, photo: null }, size)));
    return img;
  }
  const el = document.createElement('span');
  el.className = `friend-avatar ${size}`;
  el.style.background = colourFor(person.uid || name);
  el.textContent = name.charAt(0).toUpperCase();
  return el;
}