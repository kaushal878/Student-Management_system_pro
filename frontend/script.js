const API = '/students';
let students = [];
let editingId = null;
let pendingDeleteId = null;

const el = (id) => document.getElementById(id);

const setLoading = (isLoading) => el('loader').classList.toggle('hidden', !isLoading);
const toast = (msg) => {
  const t = el('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
};

const fetchStudents = async () => {
  setLoading(true);
  try {
    const res = await fetch(API);
    students = await res.json();
    render();
  } catch {
    toast('Failed to load students.');
  } finally {
    setLoading(false);
  }
};

const renderDashboard = (list) => {
  const total = list.length;
  const avgMarks = total ? (list.reduce((a, s) => a + s.percentage, 0) / total).toFixed(2) : '0.00';
  const avgAttendance = total ? (list.reduce((a, s) => a + s.attendancePercentage, 0) / total).toFixed(2) : '0.00';

  el('totalStudents').textContent = total;
  el('avgMarks').textContent = `${avgMarks}%`;
  el('avgAttendance').textContent = `${avgAttendance}%`;
};

const renderTable = (list) => {
  const tbody = el('studentsTableBody');
  tbody.innerHTML = '';

  list.forEach((s) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${s.name}</td>
      <td>${s.rollNumber}</td>
      <td>${s.className}</td>
      <td>${s.total}</td>
      <td>${s.percentage}%</td>
      <td>${s.attendancePercentage}%</td>
      <td>
        <button class="btn secondary" onclick="editStudent('${s.id}')">Edit</button>
        <button class="btn danger" onclick="openDeleteModal('${s.id}')">Delete</button>
      </td>`;
    tbody.appendChild(row);
  });
};

const getFiltered = () => {
  const q = el('searchInput').value.toLowerCase().trim();
  const classFilter = el('classFilter').value.toLowerCase().trim();

  return students.filter((s) => {
    const matchesQuery = s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q);
    const matchesClass = !classFilter || s.className.toLowerCase().includes(classFilter);
    return matchesQuery && matchesClass;
  });
};

const render = () => {
  const list = getFiltered();
  renderDashboard(list);
  renderTable(list);
};

const resetForm = () => {
  el('studentForm').reset();
  ['math', 'science', 'english', 'present', 'absent'].forEach((id) => (el(id).value = 0));
  editingId = null;
  el('formTitle').textContent = 'Add Student';
  el('saveBtn').textContent = 'Save Student';
};

const upsertStudent = async (event) => {
  event.preventDefault();
  const payload = {
    name: el('name').value,
    rollNumber: el('rollNumber').value,
    className: el('className').value,
    marks: {
      math: Number(el('math').value),
      science: Number(el('science').value),
      english: Number(el('english').value)
    },
    attendance: {
      present: Number(el('present').value),
      absent: Number(el('absent').value)
    }
  };

  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? `${API}/${editingId}` : API;

  setLoading(true);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Request failed');

    toast(editingId ? 'Student updated successfully.' : 'Student added successfully.');
    resetForm();
    await fetchStudents();
  } catch {
    toast('Operation failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

window.editStudent = (id) => {
  const s = students.find((st) => st.id === id);
  if (!s) return;
  editingId = id;
  el('formTitle').textContent = 'Edit Student';
  el('saveBtn').textContent = 'Update Student';
  el('name').value = s.name;
  el('rollNumber').value = s.rollNumber;
  el('className').value = s.className;
  el('math').value = s.marks.math;
  el('science').value = s.marks.science;
  el('english').value = s.marks.english;
  el('present').value = s.attendance.present;
  el('absent').value = s.attendance.absent;
};

window.openDeleteModal = (id) => {
  pendingDeleteId = id;
  el('confirmModal').classList.remove('hidden');
};

const deleteStudent = async () => {
  if (!pendingDeleteId) return;
  setLoading(true);
  try {
    const res = await fetch(`${API}/${pendingDeleteId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    toast('Student deleted successfully.');
    await fetchStudents();
  } catch {
    toast('Delete failed.');
  } finally {
    el('confirmModal').classList.add('hidden');
    pendingDeleteId = null;
    setLoading(false);
  }
};

const exportCSV = () => {
  if (!students.length) return toast('No data to export.');

  const headers = ['Name', 'Roll Number', 'Class', 'Math', 'Science', 'English', 'Total', 'Percentage', 'Attendance %'];
  const rows = students.map((s) => [s.name, s.rollNumber, s.className, s.marks.math, s.marks.science, s.marks.english, s.total, s.percentage, s.attendancePercentage]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported.');
};

el('studentForm').addEventListener('submit', upsertStudent);
el('cancelEdit').addEventListener('click', resetForm);
el('searchInput').addEventListener('input', render);
el('classFilter').addEventListener('input', render);
el('confirmDeleteBtn').addEventListener('click', deleteStudent);
el('cancelDeleteBtn').addEventListener('click', () => el('confirmModal').classList.add('hidden'));
el('exportBtn').addEventListener('click', exportCSV);

el('themeToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
  el('themeLabel').textContent = e.target.checked ? 'Dark Mode 🌙' : 'Light Mode ☀️';
});

el('menuBtn').addEventListener('click', () => el('sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-section').forEach((s) => s.classList.remove('active'));
    el(btn.dataset.tab).classList.add('active');
  });
});

fetchStudents();
