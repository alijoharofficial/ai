const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/submit', (req, res) => {
  const data = req.body;
  console.log('Onboarding submission:', JSON.stringify(data, null, 2));
  res.json({ success: true, message: 'Registration successful! Welcome to your Islamic learning journey.' });
});

app.listen(PORT, () => {
  console.log(`Islamic Education Onboarding running at http://localhost:${PORT}`);
});
