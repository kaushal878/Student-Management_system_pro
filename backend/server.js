const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const readDb = async () => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialData = { students: [] };
      await writeDb(initialData);
      return initialData;
    }
    throw error;
  }
};

const writeDb = async (db) => {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
};

const computeDerived = (student) => {
  const marks = student.marks || { math: 0, science: 0, english: 0 };
  const attendance = student.attendance || { present: 0, absent: 0 };

  const total = Number(marks.math) + Number(marks.science) + Number(marks.english);
  const percentage = Number((total / 3).toFixed(2));

  const totalDays = Number(attendance.present) + Number(attendance.absent);
  const attendancePercentage = totalDays > 0
    ? Number(((Number(attendance.present) / totalDays) * 100).toFixed(2))
    : 0;

  return {
    ...student,
    marks,
    attendance,
    total,
    percentage,
    attendancePercentage
  };
};

app.get('/students', async (req, res) => {
  try {
    const db = await readDb();
    const students = db.students.map(computeDerived);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

app.post('/students', async (req, res) => {
  try {
    const db = await readDb();
    const payload = req.body;

    if (!payload.name || !payload.rollNumber || !payload.className) {
      return res.status(400).json({ error: 'Name, roll number, and class are required.' });
    }

    const student = computeDerived({
      id: Date.now().toString(),
      name: payload.name.trim(),
      rollNumber: payload.rollNumber.toString().trim(),
      className: payload.className.trim(),
      marks: {
        math: Number(payload.marks?.math) || 0,
        science: Number(payload.marks?.science) || 0,
        english: Number(payload.marks?.english) || 0
      },
      attendance: {
        present: Number(payload.attendance?.present) || 0,
        absent: Number(payload.attendance?.absent) || 0
      }
    });

    db.students.push(student);
    await writeDb(db);

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add student.' });
  }
});

app.put('/students/:id', async (req, res) => {
  try {
    const db = await readDb();
    const studentIndex = db.students.findIndex((s) => s.id === req.params.id);

    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const current = db.students[studentIndex];
    const payload = req.body;

    const updatedStudent = computeDerived({
      ...current,
      name: payload.name?.trim() || current.name,
      rollNumber: payload.rollNumber?.toString().trim() || current.rollNumber,
      className: payload.className?.trim() || current.className,
      marks: {
        math: Number(payload.marks?.math ?? current.marks?.math ?? 0),
        science: Number(payload.marks?.science ?? current.marks?.science ?? 0),
        english: Number(payload.marks?.english ?? current.marks?.english ?? 0)
      },
      attendance: {
        present: Number(payload.attendance?.present ?? current.attendance?.present ?? 0),
        absent: Number(payload.attendance?.absent ?? current.attendance?.absent ?? 0)
      }
    });

    db.students[studentIndex] = updatedStudent;
    await writeDb(db);

    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

app.delete('/students/:id', async (req, res) => {
  try {
    const db = await readDb();
    const studentIndex = db.students.findIndex((s) => s.id === req.params.id);

    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const [removed] = db.students.splice(studentIndex, 1);
    await writeDb(db);

    res.json({ message: 'Student deleted successfully.', student: removed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

app.listen(PORT, () => {
  console.log(`Sajilo Student Manager Pro running at http://localhost:${PORT}`);
});
