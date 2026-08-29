/* ============================================
   ISLAMIC EDUCATION ONBOARDING — APP LOGIC
   ============================================ */

let currentStep = 1;
const totalSteps = 4;

let formData = {
  learnerType: 'children',
  childrenCount: 1,
  students: [],
  course: 'quran-reading',
  daysPerWeek: 2,
  classDurationMins: 30,
  selectedDays: [],
  timezone: '',
  startDate: '',
  startTime: ''
};

const DURATION_OPTIONS = [30, 45, 60, 90];
let durationIndex = 0;

const PRICE_TABLE = {
  30: { 2: 40, 3: 55, 4: 70, 5: 85, 6: 100, 7: 115 },
  45: { 2: 55, 3: 75, 4: 95, 5: 115, 6: 135, 7: 155 },
  60: { 2: 70, 3: 95, 4: 120, 5: 145, 6: 170, 7: 195 },
  90: { 2: 95, 3: 130, 4: 165, 5: 200, 6: 235, 7: 265 }
};

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  setMinDate();
  initStudents();
  updateProgress();
});

function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').min = today;
}

// ── Navigation ──
function goToStep(step) {
  const panelFrom = document.getElementById('step' + currentStep);
  const panelTo = document.getElementById('step' + step);

  if (step > currentStep && !validateStep(currentStep)) return;

  panelFrom.classList.remove('active');
  panelTo.classList.add('active');

  const prevDot = document.querySelector('.step-dot[data-step="' + currentStep + '"]');
  if (prevDot && step > currentStep) {
    prevDot.classList.remove('active');
    prevDot.classList.add('done');
    prevDot.innerHTML = '<span>✓</span>';
  }
  if (step < currentStep) {
    const futureDot = document.querySelector('.step-dot[data-step="' + currentStep + '"]');
    if (futureDot) { futureDot.classList.remove('done', 'active'); futureDot.innerHTML = '<span>' + currentStep + '</span>'; }
  }

  currentStep = step;
  updateProgress();

  const activeDot = document.querySelector('.step-dot[data-step="' + currentStep + '"]');
  if (activeDot) activeDot.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
  const fill = document.getElementById('progressFill');
  fill.style.width = (currentStep / totalSteps * 100) + '%';
  document.querySelectorAll('.step-dot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.classList.toggle('active', s === currentStep);
  });
}

// ── Step 1 ──
function selectChoice(card, key) {
  const cards = card.parentElement.querySelectorAll('.choice-card');
  cards.forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  formData[key] = card.dataset.value;

  const countSection = document.getElementById('childrenCountSection');
  if (formData.learnerType === 'children') {
    countSection.style.display = 'block';
    initStudents();
  } else {
    countSection.style.display = 'none';
    formData.childrenCount = 1;
    formData.students = [];
    initStudents();
  }
}

function selectCount(btn) {
  document.querySelectorAll('.count-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  formData.childrenCount = btn.dataset.count === '5' ? 5 : parseInt(btn.dataset.count);
  initStudents();
}

// ── Step 2: Students ──
function initStudents() {
  const count = formData.learnerType === 'myself' ? 1 : formData.childrenCount;
  formData.students = [];
  for (let i = 0; i < count; i++) formData.students.push(createStudentData(i + 1));
  renderStudents();
}

function createStudentData(num) {
  return { id: Date.now() + num, num, name: '', email: '', phone: '', dob: '', gender: '', countryCode: '+1', open: num === 1 };
}

function renderStudents() {
  const container = document.getElementById('studentsContainer');
  container.innerHTML = '';
  formData.students.forEach((s, i) => {
    container.appendChild(buildStudentCard(s, i));
  });

  const addBtn = document.getElementById('addStudentBtn');
  const limit = formData.learnerType === 'myself' ? 1 : (formData.childrenCount >= 5 ? 10 : formData.childrenCount);
  addBtn.style.display = formData.students.length >= limit ? 'none' : 'flex';
}

function buildStudentCard(s, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'student-accordion';
  wrap.dataset.id = s.id;

  const showRemove = formData.students.length > 1;
  const removeBtn = showRemove
    ? `<button class="btn-remove" onclick="removeStudent(${s.id})">Remove</button>`
    : '';

  wrap.innerHTML = `
    <div class="accordion-header" onclick="toggleAccordion(${s.id})">
      <span class="accordion-title">Student ${idx + 1}${s.name ? ' — ' + s.name : ''}</span>
      <div class="accordion-actions">
        ${removeBtn}
        <span class="accordion-chevron ${s.open ? 'open' : ''}">▾</span>
      </div>
    </div>
    <div class="accordion-body ${s.open ? 'open' : ''}">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input class="form-input" type="text" placeholder="Full Name" value="${s.name}"
            oninput="updateStudent(${s.id},'name',this.value)" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" placeholder="Email Address" value="${s.email}"
            oninput="updateStudent(${s.id},'email',this.value)" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Student's Number</label>
          <div class="phone-input-wrapper">
            <select class="country-select" onchange="updateStudent(${s.id},'countryCode',this.value)">
              ${buildCountryOptions(s.countryCode)}
            </select>
            <input class="phone-number" type="tel" placeholder="Phone number" value="${s.phone}"
              oninput="updateStudent(${s.id},'phone',this.value)" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input class="form-input date-input" type="date" value="${s.dob}"
            onchange="updateStudent(${s.id},'dob',this.value)" />
        </div>
      </div>
      <div class="form-row single">
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-select" onchange="updateStudent(${s.id},'gender',this.value)">
            <option value="" ${!s.gender ? 'selected' : ''}>Select gender</option>
            <option value="male" ${s.gender === 'male' ? 'selected' : ''}>Male</option>
            <option value="female" ${s.gender === 'female' ? 'selected' : ''}>Female</option>
          </select>
        </div>
      </div>
    </div>
  `;
  return wrap;
}

function buildCountryOptions(selected) {
  const countries = [
    ['🇺🇸 +1', '+1'], ['🇬🇧 +44', '+44'], ['🇵🇰 +92', '+92'],
    ['🇸🇦 +966', '+966'], ['🇦🇪 +971', '+971'], ['🇪🇬 +20', '+20'],
    ['🇧🇩 +880', '+880'], ['🇮🇳 +91', '+91'], ['🇳🇬 +234', '+234'],
    ['🇹🇷 +90', '+90'], ['🇮🇩 +62', '+62'], ['🇲🇾 +60', '+60'],
    ['🇨🇦 +1', '+1-CA'], ['🇦🇺 +61', '+61'], ['🇩🇪 +49', '+49'],
    ['🇫🇷 +33', '+33']
  ];
  return countries.map(([label, val]) =>
    `<option value="${val}" ${selected === val ? 'selected' : ''}>${label}</option>`
  ).join('');
}

function updateStudent(id, field, value) {
  const s = formData.students.find(s => s.id === id);
  if (s) {
    s[field] = value;
    if (field === 'name') {
      const card = document.querySelector(`.student-accordion[data-id="${id}"] .accordion-title`);
      const idx = formData.students.indexOf(s);
      if (card) card.textContent = `Student ${idx + 1}${value ? ' — ' + value : ''}`;
    }
  }
}

function toggleAccordion(id) {
  const s = formData.students.find(s => s.id === id);
  if (s) {
    s.open = !s.open;
    const card = document.querySelector(`.student-accordion[data-id="${id}"]`);
    const body = card.querySelector('.accordion-body');
    const chevron = card.querySelector('.accordion-chevron');
    body.classList.toggle('open', s.open);
    chevron.classList.toggle('open', s.open);
  }
}

function addStudent() {
  const newStudent = createStudentData(formData.students.length + 1);
  newStudent.open = true;
  formData.students.forEach(s => s.open = false);
  formData.students.push(newStudent);
  renderStudents();

  setTimeout(() => {
    const container = document.getElementById('studentsContainer');
    container.scrollTop = container.scrollHeight;
  }, 100);
}

function removeStudent(id) {
  if (formData.students.length <= 1) return;
  formData.students = formData.students.filter(s => s.id !== id);
  formData.students.forEach((s, i) => s.num = i + 1);
  if (!formData.students.some(s => s.open)) formData.students[0].open = true;
  renderStudents();
}

// ── Step 3: Course ──
function selectCourse(card) {
  document.querySelectorAll('.course-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  formData.course = card.dataset.course;
  updatePricing();
}

function adjustDays(delta) {
  formData.daysPerWeek = Math.min(7, Math.max(1, formData.daysPerWeek + delta));
  document.getElementById('daysPerWeek').textContent = formData.daysPerWeek;
  updatePricing();
}

function adjustDuration(delta) {
  durationIndex = Math.min(DURATION_OPTIONS.length - 1, Math.max(0, durationIndex + delta));
  formData.classDurationMins = DURATION_OPTIONS[durationIndex];
  document.getElementById('classDuration').textContent = formData.classDurationMins + ' Mins';
  updatePricing();
}

function updatePricing() {
  const classesPerMonth = formData.daysPerWeek * 4;
  document.getElementById('classesPerMonth').textContent = classesPerMonth + ' Classes';

  const dMin = formData.classDurationMins;
  const dDay = formData.daysPerWeek;
  const priceRow = PRICE_TABLE[dMin];
  const price = priceRow ? (priceRow[dDay] || priceRow[Math.max(...Object.keys(priceRow).filter(k => k <= dDay).map(Number))]) : 40;
  document.getElementById('coursePrice').textContent = '$' + (price || 40) + ' / Month';
}

// ── Step 4: Schedule ──
function toggleDay(btn) {
  btn.classList.toggle('active');
  const day = btn.dataset.day;
  if (btn.classList.contains('active')) {
    if (!formData.selectedDays.includes(day)) formData.selectedDays.push(day);
  } else {
    formData.selectedDays = formData.selectedDays.filter(d => d !== day);
  }
  const needed = formData.daysPerWeek;
  document.getElementById('daysSelectedCount').textContent =
    `(${formData.selectedDays.length}/${needed} selected)`;
}

// ── Validation ──
function validateStep(step) {
  if (step === 1) return true;

  if (step === 2) {
    const invalid = formData.students.some(s =>
      !s.name.trim() || !s.email.trim() || !s.phone.trim() || !s.dob || !s.gender
    );
    if (invalid) {
      showToast('Please fill in all student details before continuing.', 'error');
      return false;
    }
    if (!isValidEmail(formData.students.map(s => s.email))) {
      showToast('Please enter valid email addresses.', 'error');
      return false;
    }
    return true;
  }

  if (step === 3) return true;

  if (step === 4) {
    const needed = formData.daysPerWeek;
    if (formData.selectedDays.length < needed) {
      showToast(`Please select ${needed} day(s) for your schedule.`, 'error');
      return false;
    }
    if (!document.getElementById('timezoneSelect').value) {
      showToast('Please select your timezone.', 'error');
      return false;
    }
    if (!document.getElementById('startDate').value) {
      showToast('Please select a preferred start date.', 'error');
      return false;
    }
    if (!document.getElementById('startTime').value) {
      showToast('Please select a preferred start time.', 'error');
      return false;
    }
    return true;
  }
  return true;
}

function isValidEmail(emails) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emails.every(e => re.test(e));
}

// ── Submit ──
function showSuccess() {
  document.getElementById('step4').classList.remove('active');
  document.getElementById('stepSuccess').classList.add('active');
  document.querySelectorAll('.step-dot').forEach(d => {
    d.classList.remove('active');
    d.classList.add('done');
    d.innerHTML = '<span>✓</span>';
  });
  document.getElementById('progressFill').style.width = '100%';
}

async function submitForm() {
  if (!validateStep(4)) return;

  formData.timezone = document.getElementById('timezoneSelect').value;
  formData.startDate = document.getElementById('startDate').value;
  formData.startTime = document.getElementById('startTime').value;

  const submitBtn = document.querySelector('.btn-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-submit-icon">⏳</span> Submitting...';

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (data.success) showSuccess();
  } catch {
    // Static deployment — no server, show success directly
    showSuccess();
  }

}

function resetForm() {
  currentStep = 1;
  formData = { learnerType: 'children', childrenCount: 1, students: [], course: 'quran-reading', daysPerWeek: 2, classDurationMins: 30, selectedDays: [], timezone: '', startDate: '', startTime: '' };
  durationIndex = 0;

  document.getElementById('stepSuccess').classList.remove('active');
  document.getElementById('step1').classList.add('active');
  document.getElementById('progressFill').style.width = '25%';
  document.querySelectorAll('.step-dot').forEach((d, i) => {
    d.className = 'step-dot' + (i === 0 ? ' active' : '');
    d.innerHTML = `<span>${i + 1}</span>`;
  });

  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('daysSelectedCount').textContent = '(0/2 selected)';
  document.getElementById('timezoneSelect').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('startTime').value = '';

  initStudents();
}

// ── Toast ──
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.style.cssText = `
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    background: ${type === 'error' ? '#E53E3E' : '#38A169'};
    color: white; padding: 14px 24px; border-radius: 12px;
    font-size: 14px; font-weight: 600; font-family: Inter, sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,.25); z-index: 9999;
    animation: slideInUp .3s ease; max-width: 380px; text-align: center;
  `;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = '@keyframes slideInUp { from { transform: translateX(-50%) translateY(20px); opacity:0; } to { transform: translateX(-50%) translateY(0); opacity:1; } }';
  document.head.appendChild(style);

  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}
