'use strict';

/* ===== TaskFlow - Main Script ===== */
const STORAGE_KEY = 'taskflow.tasks';
const THEME_KEY = 'taskflow.theme';

/* ---------- Storage helpers ---------- */
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return null;
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function dateFromToday(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function sampleTasks() {
  return [
    { id: 1, title: 'Complete HTML & CSS assignment', due: dateFromToday(1), priority: 'high', category: 'Study', done: false },
    { id: 2, title: 'Revise JavaScript DOM concepts', due: dateFromToday(2), priority: 'medium', category: 'Study', done: false },
    { id: 3, title: 'Push TaskFlow project to GitHub', due: dateFromToday(3), priority: 'high', category: 'Project', done: false },
    { id: 4, title: 'Test website on mobile screen sizes', due: dateFromToday(4), priority: 'medium', category: 'Project', done: false },
    { id: 5, title: 'Prepare internship report', due: dateFromToday(6), priority: 'high', category: 'Report', done: false },
    { id: 6, title: 'Submit weekly activity report', due: dateFromToday(-1), priority: 'low', category: 'Report', done: true },
    { id: 7, title: 'Read Flexbox and Grid guide', due: dateFromToday(-2), priority: 'low', category: 'Study', done: true },
    { id: 8, title: 'Project review meeting with mentor', due: dateFromToday(5), priority: 'medium', category: 'Meeting', done: false }
  ];
}

/* ---------- Theme and navigation ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const button = document.getElementById('themeToggle');
  if (button) button.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

function initCommon() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');

  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
}

/* ---------- Home page statistics ---------- */
function initHomePage() {
  const tasks = loadTasks() || sampleTasks();
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.done).length,
    pending: tasks.filter(t => !t.done).length,
    high: tasks.filter(t => t.priority === 'high' && !t.done).length
  };
  document.querySelectorAll('[data-stat]').forEach(el => {
    el.textContent = stats[el.dataset.stat];
  });
}

/* ---------- Tasks page ---------- */
function validateTask(title, due, isEditing) {
  const errors = {};
  if (title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters.';
  }
  if (!due) {
    errors.dueDate = 'Please choose a due date.';
  } else if (!isEditing && due < dateFromToday(0)) {
    errors.dueDate = 'Due date cannot be in the past.';
  }
  return errors;
}

function initTasksPage() {
  let tasks = loadTasks();
  if (!tasks) {
    tasks = sampleTasks();
    saveTasks(tasks);
  }
  const state = { filter: 'all', query: '', priority: 'all', editingId: null };

  const form = document.getElementById('taskForm');
  const titleInput = document.getElementById('title');
  const dueInput = document.getElementById('dueDate');
  const priorityInput = document.getElementById('priority');
  const categoryInput = document.getElementById('category');
  const list = document.getElementById('taskList');

  dueInput.min = dateFromToday(0);

  function showErrors(errors) {
    document.getElementById('titleError').textContent = errors.title || '';
    document.getElementById('dueDateError').textContent = errors.dueDate || '';
    titleInput.classList.toggle('invalid', Boolean(errors.title));
    dueInput.classList.toggle('invalid', Boolean(errors.dueDate));
  }

  function resetForm() {
    form.reset();
    state.editingId = null;
    showErrors({});
    document.getElementById('formHeading').textContent = 'Add a New Task';
    document.getElementById('submitBtn').textContent = 'Add Task';
    document.getElementById('cancelEdit').hidden = true;
  }

  function getVisibleTasks() {
    return tasks
      .filter(t => state.filter === 'all' || (state.filter === 'completed' ? t.done : !t.done))
      .filter(t => state.priority === 'all' || t.priority === state.priority)
      .filter(t => t.title.toLowerCase().includes(state.query.toLowerCase()))
      .sort((a, b) => a.done - b.done || a.due.localeCompare(b.due));
  }

  function createTaskElement(task) {
    const item = document.createElement('li');
    item.className = `task ${task.priority}${task.done ? ' done' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const body = document.createElement('div');
    body.className = 'task-body';
    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const overdue = !task.done && task.due < dateFromToday(0);
    meta.innerHTML = `<span class="badge ${task.priority}">${task.priority}</span>
      <span class="tag">${task.category}</span>
      <span class="${overdue ? 'overdue' : ''}">Due: ${task.due}${overdue ? ' (overdue)' : ''}</span>`;
    body.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(task.id));
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    actions.append(editBtn, deleteBtn);

    item.append(checkbox, body, actions);
    return item;
  }

  function render() {
    const visible = getVisibleTasks();
    list.replaceChildren(...visible.map(createTaskElement));
    document.getElementById('emptyMessage').hidden = visible.length > 0;
    const remaining = tasks.filter(t => !t.done).length;
    document.getElementById('summary').textContent =
      `Showing ${visible.length} of ${tasks.length} tasks - ${remaining} pending`;
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    task.done = !task.done;
    saveTasks(tasks);
    render();
  }

  function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
    render();
  }

  function startEdit(id) {
    const task = tasks.find(t => t.id === id);
    state.editingId = id;
    titleInput.value = task.title;
    dueInput.value = task.due;
    priorityInput.value = task.priority;
    categoryInput.value = task.category;
    document.getElementById('formHeading').textContent = 'Edit Task';
    document.getElementById('submitBtn').textContent = 'Save Changes';
    document.getElementById('cancelEdit').hidden = false;
    titleInput.focus();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const errors = validateTask(titleInput.value, dueInput.value, state.editingId !== null);
    showErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const data = {
      title: titleInput.value.trim(),
      due: dueInput.value,
      priority: priorityInput.value,
      category: categoryInput.value
    };
    if (state.editingId !== null) {
      Object.assign(tasks.find(t => t.id === state.editingId), data);
    } else {
      tasks.push({ id: Date.now(), done: false, ...data });
    }
    saveTasks(tasks);
    resetForm();
    render();
  });

  document.getElementById('cancelEdit').addEventListener('click', resetForm);
  document.getElementById('searchInput').addEventListener('input', e => { state.query = e.target.value; render(); });
  document.getElementById('priorityFilter').addEventListener('change', e => { state.priority = e.target.value; render(); });
  document.getElementById('statusFilters').addEventListener('click', e => {
    if (!e.target.dataset.filter) return;
    state.filter = e.target.dataset.filter;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === e.target));
    render();
  });

  render();
}

/* ---------- Contact page ---------- */
function initContactPage() {
  const form = document.getElementById('contactForm');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const fields = {
      name: { value: form.elements.name.value.trim(), valid: v => v.length >= 3, message: 'Please enter your name (min 3 characters).' },
      email: { value: form.elements.email.value.trim(), valid: v => emailPattern.test(v), message: 'Please enter a valid email address.' },
      message: { value: form.elements.message.value.trim(), valid: v => v.length >= 10, message: 'Message must be at least 10 characters.' }
    };
    let allValid = true;
    for (const [key, field] of Object.entries(fields)) {
      const ok = field.valid(field.value);
      document.getElementById(`${key}Error`).textContent = ok ? '' : field.message;
      form.elements[key].classList.toggle('invalid', !ok);
      if (!ok) allValid = false;
    }
    document.getElementById('formSuccess').hidden = !allValid;
    if (allValid) form.reset();
  });
}

/* ---------- Start ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initCommon();
  const page = document.body.dataset.page;
  if (page === 'tasks') initTasksPage();
  else if (page === 'contact') initContactPage();
  else initHomePage();
});
