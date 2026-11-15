function make(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function select(label, options, onChange) {
  const el = make('select', 'friend-input list-select');
  el.setAttribute('aria-label', label);
  options.forEach(option => {
    const item = make('option');
    item.value = option.id;
    item.textContent = option.label;
    el.appendChild(item);
  });
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

export function createListTools({ search, sorts, filters = [], onChange }) {
  const state = { query: '', sort: sorts[0].id, filter: filters.length ? filters[0].id : '' };
  const root = make('div', 'list-tools');
  const input = make('input', 'friend-input list-search');
  input.type = 'search';
  input.placeholder = search;
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.maxLength = 60;
  input.setAttribute('aria-label', search);
  input.addEventListener('input', () => {
    state.query = input.value.trim().toLowerCase();
    onChange('query');
  });
  const row = make('div', 'list-selects');
  row.appendChild(
    select('Sort', sorts, value => {
      state.sort = value;
      onChange('sort');
    })
  );
  if (filters.length) {
    row.appendChild(
      select('Show', filters, value => {
        state.filter = value;
        onChange('filter');
      })
    );
  }
  root.append(input, row);
  return {
    el: root,
    state,
    active: () => !!state.query || (filters.length > 0 && state.filter !== filters[0].id),
    matches: text => !state.query || text.toLowerCase().includes(state.query)
  };
}