import { h, readFile, toast } from './dom.js';
import { store } from './store.js';
import { app, render, navigate } from './core.js';
import { t } from './i18n.js';
import { confirmButton, emptyState } from './ui.js';

export const TAGS = ['noDemon', 'noEvil', 'simpleRole'];

export function viewClasses() {
  const classes = store.lib.classes;
  return h('div', { class: 'page narrow' },
    h('div', { class: 'page-head' },
      h('h1', { class: 'page-title' }, t('navClasses')),
      h('p', { class: 'muted' }, t('classesLead'))),
    h('form', {
      class: 'inline-form',
      onsubmit: (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        if (!input.value.trim()) return;
        const c = store.addClass(input.value);
        navigate('class', { id: c.id });
      },
    },
    h('input', { id: 'new-class', class: 'input', placeholder: t('classNamePh'), 'aria-label': t('className') }),
    h('button', { class: 'btn primary', type: 'submit' }, t('addClass'))),
    classes.length
      ? h('ul', { class: 'class-list' }, classes.map((c) => {
        const n = store.studentsOf(c.id).length;
        const groups = store.lib.groups.filter((g) => g.classId === c.id);
        return h('li', null, h('button', { class: 'class-row', onclick: () => navigate('class', { id: c.id }) },
          h('span', { class: 'class-name display' }, c.name),
          h('span', { class: 'muted' }, `${n} ${t('studentsCount')}`),
          h('span', { class: 'chips' }, groups.map((g) => h('span', { class: 'chip' }, g.name)))));
      }))
      : emptyState(t('noClasses'), t('noClassesHint')));
}

// ——— import ———
function detectDelimiter(line) {
  const counts = { ';': 0, '\t': 0, ',': 0 };
  for (const ch of line) if (ch in counts) counts[ch]++;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : null;
}

export function parseRoster(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], header: false, col: 0 };
  const delim = detectDelimiter(lines[0]);
  const rows = lines.map((l) => (delim ? l.split(delim) : [l]).map((c) => c.trim().replace(/^"(.*)"$/, '$1').trim()));
  const first = rows[0];
  const firstNameIdx = first.findIndex((c) => /^(fornavn|first ?name|given ?name)$/i.test(c));
  const nameIdx = first.findIndex((c) => /^(navn|name|elev|student|elevnavn)$/i.test(c));
  const header = firstNameIdx >= 0 || nameIdx >= 0 || first.some((c) => /^(etternavn|last ?name|klasse|class)$/i.test(c));
  const col = firstNameIdx >= 0 ? firstNameIdx : nameIdx >= 0 ? nameIdx : 0;
  return { rows, header, col };
}

function importPanel(cls) {
  const st = app.importState || (app.importState = { text: '', col: null, firstWord: true, groupId: '' });
  const parsed = parseRoster(st.text);
  const col = st.col === null ? parsed.col : st.col;
  const dataRows = parsed.header ? parsed.rows.slice(1) : parsed.rows;
  const names = dataRows.map((r) => (r[col] || '').trim()).map((n) => (st.firstWord ? n.split(/\s+/)[0] : n)).filter(Boolean);
  const cols = parsed.rows.length ? Math.max(...parsed.rows.map((r) => r.length)) : 0;
  const groups = store.lib.groups.filter((g) => g.classId === cls.id);
  return h('section', { class: 'panel import' },
    h('h2', { class: 'section-title' }, t('importStudents')),
    h('p', { class: 'muted small' }, t('importHelp')),
    h('div', { class: 'row gap wrap' },
      h('label', { class: 'btn ghost file-btn' }, t('chooseFile'),
        h('input', {
          type: 'file', accept: '.csv,.txt,.tsv', class: 'visually-hidden',
          onchange: async (e) => { const f = e.target.files[0]; if (f) { st.text = await readFile(f); st.col = null; render(); } },
        }))),
    h('textarea', {
      id: 'import-text', class: 'textarea mono', rows: 6, placeholder: 'Fornavn;Etternavn\nMarkus;Hansen\nFrida;Olsen',
      value: st.text, oninput: (e) => { st.text = e.target.value; st.col = null; render(); },
    }),
    cols > 1 ? h('div', { class: 'row gap wrap' },
      h('span', { class: 'label' }, t('whichColumn')),
      Array.from({ length: cols }, (_, i) => h('button', {
        type: 'button', class: 'seg' + (i === col ? ' active' : ''), onclick: () => { st.col = i; render(); },
      }, parsed.header ? parsed.rows[0][i] || `#${i + 1}` : `#${i + 1}: ${(parsed.rows[0][i] || '').slice(0, 14)}`))) : null,
    h('div', { class: 'row gap wrap' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.firstWord, onchange: (e) => { st.firstWord = e.target.checked; render(); } }), t('firstWordOnly')),
      groups.length ? h('label', { class: 'row gap' }, h('span', { class: 'label' }, t('addToGroup')),
        h('select', { class: 'select', onchange: (e) => { st.groupId = e.target.value; } },
          h('option', { value: '' }, '—'),
          groups.map((g) => h('option', { value: g.id, selected: st.groupId === g.id }, g.name)))) : null),
    names.length ? h('p', { class: 'preview-names' }, h('strong', null, `${names.length}: `), names.slice(0, 40).join(', ') + (names.length > 40 ? ' …' : '')) : null,
    h('div', { class: 'row gap' },
      h('button', {
        class: 'btn primary', disabled: !names.length,
        onclick: () => { store.addStudents(cls.id, names, st.groupId || null); toast(t('imported', { n: names.length })); app.importState = null; app.importOpen = false; render(); },
      }, t('importN', { n: names.length })),
      h('button', { class: 'btn ghost', onclick: () => { app.importOpen = false; app.importState = null; render(); } }, t('cancel'))));
}

export function viewClass() {
  const cls = store.lib.classes.find((c) => c.id === app.params.id);
  if (!cls) return viewClasses();
  const groups = store.lib.groups.filter((g) => g.classId === cls.id);
  const filter = groups.find((g) => g.id === app.classFilter) ? app.classFilter : null;
  const students = store.studentsOf(cls.id, filter);
  const names = store.studentsOf(cls.id).map((s) => s.firstName.toLowerCase());
  const dup = new Set(names.filter((n, i) => names.indexOf(n) !== i));
  const otherClasses = store.lib.classes.filter((c) => c.id !== cls.id);

  const addStudent = (e) => {
    e.preventDefault();
    const input = document.getElementById('add-student');
    const v = input.value.trim();
    if (!v) return;
    store.addStudents(cls.id, [v], filter);
    input.value = '';
    document.getElementById('add-student').focus();
  };

  return h('div', { class: 'page' },
    h('div', { class: 'page-head row between wrap' },
      h('div', { class: 'row gap' },
        h('button', { class: 'btn ghost', onclick: () => navigate('classes') }, '← ' + t('navClasses')),
        h('input', { id: 'class-name', class: 'input title-input display', value: cls.name, 'aria-label': t('className'), onchange: (e) => store.renameClass(cls.id, e.target.value) })),
      confirmButton({ key: 'delclass' + cls.id, label: t('deleteClass'), confirmLabel: t('deleteClassConfirm'), onConfirm: () => { store.deleteClass(cls.id); navigate('classes'); } })),

    h('div', { class: 'groupbar' },
      h('button', { class: 'seg' + (!filter ? ' active' : ''), onclick: () => { app.classFilter = null; render(); } }, `${t('allStudents')} (${store.studentsOf(cls.id).length})`),
      groups.map((g) => h('button', { class: 'seg' + (filter === g.id ? ' active' : ''), onclick: () => { app.classFilter = g.id; render(); } }, `${g.name} (${g.studentIds.length})`)),
      h('form', {
        class: 'inline-form small',
        onsubmit: (e) => { e.preventDefault(); const i = e.target.querySelector('input'); if (i.value.trim()) { const g = store.addGroup(cls.id, i.value); app.classFilter = g.id; i.value = ''; } },
      }, h('input', { id: 'new-group', class: 'input', placeholder: t('newGroupPh'), 'aria-label': t('newGroupPh') }), h('button', { class: 'btn', type: 'submit' }, '+'))),

    filter ? h('div', { class: 'row gap wrap group-tools' },
      h('input', { id: 'group-name', class: 'input', value: groups.find((g) => g.id === filter).name, 'aria-label': t('groupName'), onchange: (e) => store.renameGroup(filter, e.target.value) }),
      h('span', { class: 'muted small' }, t('groupHint')),
      confirmButton({ key: 'delgroup' + filter, label: t('deleteGroup'), onConfirm: () => { store.deleteGroup(filter); app.classFilter = null; } })) : null,

    h('div', { class: 'row gap wrap' },
      h('form', { class: 'inline-form grow', onsubmit: addStudent },
        h('input', { id: 'add-student', class: 'input', placeholder: t('firstNamePh'), autocomplete: 'off', 'aria-label': t('firstName') }),
        h('button', { class: 'btn primary', type: 'submit' }, t('addStudent'))),
      h('button', { class: 'btn', onclick: () => { app.importOpen = !app.importOpen; render(); } }, t('importStudents'))),
    app.importOpen ? importPanel(cls) : null,

    students.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table students' },
      h('thead', null, h('tr', null,
        h('th', null, t('firstName')),
        h('th', null, t('groups')),
        h('th', null, t('tags')),
        h('th', { class: 'right' }, ''))),
      h('tbody', null, students.map((s) => h('tr', { class: dup.has(s.firstName.toLowerCase()) ? 'dup' : '' },
        h('td', null,
          h('input', { id: 'sn-' + s.id, class: 'input cell', value: s.firstName, 'aria-label': t('firstName'), onchange: (e) => store.updateStudent(s.id, { firstName: e.target.value.trim() || s.firstName }) }),
          dup.has(s.firstName.toLowerCase()) ? h('span', { class: 'hint warn' }, t('dupName')) : null),
        h('td', null, h('div', { class: 'chips' }, groups.length ? groups.map((g) => h('button', {
          class: 'chip toggle' + (g.studentIds.includes(s.id) ? ' on' : ''), 'aria-pressed': g.studentIds.includes(s.id) ? 'true' : 'false',
          onclick: () => store.toggleGroupMember(g.id, s.id),
        }, g.name)) : h('span', { class: 'muted small' }, '—'))),
        h('td', null, h('div', { class: 'chips' }, TAGS.map((tag) => h('button', {
          class: 'chip toggle tag' + (s.tags.includes(tag) ? ' on' : ''), 'aria-pressed': s.tags.includes(tag) ? 'true' : 'false', title: t('tagHelp_' + tag),
          onclick: () => store.toggleTag(s.id, tag),
        }, t('tag_' + tag))))),
        h('td', { class: 'right nowrap' },
          otherClasses.length ? h('select', { class: 'select small', 'aria-label': t('moveTo'), onchange: (e) => { if (e.target.value) store.moveStudent(s.id, e.target.value); } },
            h('option', { value: '' }, t('moveTo')), otherClasses.map((c) => h('option', { value: c.id }, c.name))) : null,
          confirmButton({ key: 'dels' + s.id, label: '✕', confirmLabel: t('delete'), cls: 'btn danger small', onConfirm: () => store.deleteStudent(s.id) }))))))) : emptyState(t('noStudents'), t('noStudentsHint')),
    h('p', { class: 'muted small' }, t('tagsExplain')));
}
