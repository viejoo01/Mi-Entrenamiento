let data = JSON.parse(localStorage.getItem("data")) || [];

let currentExercise = null;
let timerInterval = null;
let chart = null;

let guidedMode = false;
let guidedIndex = 0;

// 💾 GUARDAR
function save() {
  localStorage.setItem("data", JSON.stringify(data));
}

// 🧭 TABS
function showTab(event, tabId) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  event.target.classList.add("active");
}

// =========================
// 📅 DÍAS
// =========================
function addDay() {
  const input = document.getElementById("dayName");
  const name = input.value.trim();

  if (!name) return;

  data.push({ name, exercises: [] });
  input.value = "";

  save();
  renderDays();
}

function renderDays() {
  const select = document.getElementById("daySelect");
  const list = document.getElementById("dayList");

  if (select) select.innerHTML = "";
  if (list) list.innerHTML = "";

  data.forEach((d, i) => {
    // SELECT
    if (select) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = d.name;
      select.appendChild(option);
    }

    // LISTA VISUAL
    if (list) {
      const li = document.createElement("li");
      li.textContent = d.name;
      list.appendChild(li);
    }
  });

  renderExercises();
}

// =========================
// 🧠 DETECTAR TIPO EJERCICIO
// =========================
function getIncrementByExercise(name) {
  const lower = name.toLowerCase();

  if (
    lower.includes("mancuerna") ||
    lower.includes("mancuernas") ||
    lower.includes("db") ||
    lower.includes("dumbbell")
  ) {
    return 2.5;
  }

  return 5;
}

// =========================
// ⚙️ EJERCICIOS
// =========================
function addExercise() {
  const dayIndex = document.getElementById("daySelect").value;
  const name = document.getElementById("exerciseName").value;

  if (!name) return;

  if (!data[dayIndex]) {
    showToast("Primero creá un día");
    return;
  }

  const baseWeight = parseFloat(prompt("Peso base (kg)")) || 0;
  const sets = parseInt(prompt("Series")) || 3;
  const reps = parseInt(prompt("Reps objetivo")) || 10;
  const rest = parseInt(prompt("Descanso (segundos)")) || 60;

  data[dayIndex].exercises.push({
    name,
    baseWeight,
    targetSets: sets,
    reps,
    rest,
    history: []
  });

  document.getElementById("exerciseName").value = "";

  save();
  renderExercises();
}

// =========================
// 📋 RENDER EJERCICIOS
// =========================
function renderExercises() {
  const dayIndex = document.getElementById("daySelect")?.value;
  const list = document.getElementById("exerciseList");
  const configList = document.getElementById("exerciseConfigList");

  if (list) list.innerHTML = "";
  if (configList) configList.innerHTML = "";

  if (!data[dayIndex]) return;

  data[dayIndex].exercises.forEach((ex, i) => {
    // 👉 LISTA ENTRENAR
    if (list) {
      const li = document.createElement("li");
      li.textContent = ex.name;

      if (i === currentExercise) li.classList.add("active");

      li.onclick = () => {
        currentExercise = i;
        renderExercises();
        renderHistory(i);
        showToast("Ejercicio: " + ex.name);
      };

      list.appendChild(li);
    }

    // 👉 LISTA CONFIG
    if (configList) {
      const li = document.createElement("li");

      li.innerHTML = `
        <strong>${ex.name}</strong><br>
        <span class="small">
          Base: ${ex.baseWeight || 0}kg |
          Series: ${ex.targetSets} |
          Reps: ${ex.reps} |
          Descanso: ${ex.rest}s
        </span>
      `;

      configList.appendChild(li);
    }
  });
}

// =========================
// 📊 HISTORIAL
// =========================
function renderHistory(exIndex) {
  currentExercise = exIndex;

  const dayIndex = document.getElementById("daySelect").value;
  const historyList = document.getElementById("history");

  historyList.innerHTML = "";

  const exercise = data[dayIndex].exercises[exIndex];
  const history = exercise.history;

  // 🔥 SERIES
  const setsDone = history.length % exercise.targetSets || 0;

  const seriesInfo = document.createElement("li");
  seriesInfo.innerHTML = `📊 Serie ${setsDone + 1} / ${exercise.targetSets}`;
  seriesInfo.classList.add("active");
  historyList.appendChild(seriesInfo);

  // 🔥 AUTOCOMPLETE
  if (history.length === 0) {
    document.getElementById("weight").value = exercise.baseWeight || "";
    document.getElementById("reps").value = exercise.reps || "";
  }

  const stats = calculateStats(history);
  const suggestion = getSuggestion(history);

  if (stats) {
    document.getElementById("weight").value =
      stats.last.weight || exercise.baseWeight;

    document.getElementById("reps").value = stats.last.reps;
    document.getElementById("weight").focus();
  }

  // 🔥 BOTÓN DINÁMICO
  const increment = getIncrementByExercise(exercise.name);
  const btn = document.getElementById("increaseBtn");

  if (btn) {
    btn.textContent = `🔼 Subir nivel (+${increment}kg)`;
  }

  // 📊 STATS
  if (stats) {
    const statsBox = document.createElement("li");

    statsBox.innerHTML = `
      🏆 PR: ${stats.bestWeight}kg <br>
      💪 Volumen máx: ${stats.bestVolume} <br>
      📊 Promedio: ${stats.avgVolume} <br>
      ⚡ Último: ${stats.last.weight}kg x ${stats.last.reps}
      ${suggestion ? `<br>🚀 Sugerido: ${suggestion.weight}kg x ${suggestion.reps}` : ""}
    `;

    statsBox.classList.add("active");
    historyList.appendChild(statsBox);
  }

  // 📜 HISTORIAL
  history.slice().reverse().forEach(r => {
    const li = document.createElement("li");

    li.innerHTML = `
      ${r.date} - ${r.weight}kg x ${r.reps}
      ${r.isPR ? "🔥" : ""}
    `;

    historyList.appendChild(li);
  });

  renderChart(history);
}

// =========================
// ➕ REGISTRO
// =========================
function addRecord() {
  const dayIndex = document.getElementById("daySelect").value;

  if (currentExercise === null) {
    showToast("Seleccioná un ejercicio");
    return;
  }

  const weight = parseFloat(document.getElementById("weight").value);
  const reps = parseInt(document.getElementById("reps").value);

  if (isNaN(weight) || isNaN(reps)) {
    showToast("Datos inválidos");
    return;
  }

  const exercise = data[dayIndex].exercises[currentExercise];

  const previousBest = Math.max(0, ...exercise.history.map(h => h.weight || 0));
  const isPR = weight > previousBest;

  exercise.history.push({
    weight,
    reps,
    date: new Date().toLocaleDateString(),
    isPR
  });

  save();
  renderHistory(currentExercise);

  showToast("Serie guardada");

  if (isPR) showToast("🔥 Nuevo récord!");

  handleSetProgress();
  startTimer();
}

// =========================
// 🔼 PROGRESIÓN
// =========================
function increaseWeight() {
  const dayIndex = document.getElementById("daySelect").value;

  if (currentExercise === null) {
    showToast("Seleccioná un ejercicio");
    return;
  }

  const exercise = data[dayIndex].exercises[currentExercise];

  const increment = getIncrementByExercise(exercise.name);

  exercise.baseWeight = (exercise.baseWeight || 0) + increment;

  save();

  document.getElementById("weight").value = exercise.baseWeight;

  showToast(`+${increment}kg → ${exercise.baseWeight}kg`);
}

// =========================
// 📊 STATS
// =========================
function calculateStats(history) {
  if (history.length === 0) return null;

  let bestWeight = 0;
  let bestVolume = 0;
  let totalVolume = 0;

  history.forEach(r => {
    const volume = r.weight * r.reps;

    if (r.weight > bestWeight) bestWeight = r.weight;
    if (volume > bestVolume) bestVolume = volume;

    totalVolume += volume;
  });

  const avgVolume = Math.round(totalVolume / history.length);
  const last = history[history.length - 1];

  return { bestWeight, bestVolume, avgVolume, last };
}

// =========================
// 🧠 SUGERENCIA
// =========================
function getSuggestion(history) {
  if (history.length === 0) return null;

  const last = history[history.length - 1];

  let suggestedWeight = last.weight;

  if (last.reps >= 10) suggestedWeight += 2.5;
  else if (last.reps >= 6) suggestedWeight += 1.25;

  return { weight: suggestedWeight, reps: last.reps };
}

// =========================
// ⏱️ TIMER
// =========================
function startTimer() {
  let time = parseInt(document.getElementById("restTime").value);

  if (!time || time <= 0) return;

  clearInterval(timerInterval);
  updateDisplay(time);

  timerInterval = setInterval(() => {
    time--;
    updateDisplay(time);

    if (time <= 0) {
      clearInterval(timerInterval);

      if (navigator.vibrate) navigator.vibrate(500);

      new Audio("https://www.soundjay.com/buttons/beep-07.wav").play();

      showToast("⏰ Descanso terminado");
    }
  }, 1000);
}

function updateDisplay(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;

  document.getElementById("timerDisplay").textContent =
    `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

// =========================
// 🔔 TOAST
// =========================
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 2000);
}

// =========================
// 🧠 PROGRESO SERIES
// =========================
function handleSetProgress() {
  const dayIndex = document.getElementById("daySelect").value;
  const exercise = data[dayIndex].exercises[currentExercise];

  const setsDone = exercise.history.length % exercise.targetSets;

  if (setsDone !== 0) {
    showToast(`💪 Serie ${setsDone}/${exercise.targetSets}`);
  } else {
    showToast("✅ Ejercicio completado");
    moveToNextExercise();
  }
}

function moveToNextExercise() {
  const dayIndex = document.getElementById("daySelect").value;
  const exercises = data[dayIndex].exercises;

  if (guidedIndex < exercises.length - 1) {
    guidedIndex++;
    currentExercise = guidedIndex;

    renderExercises();
    renderHistory(currentExercise);

    showToast("➡️ " + exercises[currentExercise].name);
  } else {
    guidedMode = false;
    showToast("🏁 Rutina terminada");
  }
}

// =========================
// ▶️ MODO GUIADO
// =========================
function startGuidedMode() {
  const dayIndex = document.getElementById("daySelect").value;

  if (!data[dayIndex] || data[dayIndex].exercises.length === 0) {
    showToast("No hay ejercicios");
    return;
  }

  guidedMode = true;
  guidedIndex = 0;
  currentExercise = 0;

  renderExercises();
  renderHistory(0);

  showToast("🔥 Rutina iniciada");
}

// =========================
// 📤 EXPORT / IMPORT
// =========================
function exportJSON() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "backup.json";
  a.click();

  showToast("Backup exportado");
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      data = JSON.parse(e.target.result);
      save();
      renderDays();
      showToast("Datos importados");
    } catch {
      showToast("Error");
    }
  };

  reader.readAsText(file);
}

function exportCSV() {
  let rows = [["Día", "Ejercicio", "Fecha", "Peso", "Reps", "PR"]];

  data.forEach(day => {
    day.exercises.forEach(ex => {
      ex.history.forEach(h => {
        rows.push([day.name, ex.name, h.date, h.weight, h.reps, h.isPR ? "Sí" : "No"]);
      });
    });
  });

  const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "entrenamiento.csv";
  a.click();

  showToast("Exportado");
}

// =========================
// 📈 CHART
// =========================
function renderChart(history) {
  const ctx = document.getElementById("progressChart");
  if (!ctx) return;

  const labels = history.map(h => h.date);
  const weights = history.map(h => h.weight);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Peso",
        data: weights,
        tension: 0.3
      }]
    }
  });
}

// INIT
renderDays();