let data = JSON.parse(localStorage.getItem("data")) || [];
let currentExercise = null;
let timerInterval = null;
let chart = null;
let guidedMode = false;
let guidedIndex = 0;
let currentSet = 1;
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

// 🔹 DÍAS
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
  select.innerHTML = "";

  data.forEach((d, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = d.name;
    select.appendChild(option);
  });

  renderExercises();
}

// 🔹 EJERCICIOS
function addExercise() {
  const dayIndex = document.getElementById("daySelect").value;
  const input = document.getElementById("exerciseName").value;

  if (!input) return;

  if (!data[dayIndex]) {
    showToast("Primero creá un día");
    return;
  }

  const sets = parseInt(prompt("¿Cuántas series?")) || 3;

  data[dayIndex].exercises.push({
    name: input,
    history: [],
    targetSets: sets
  });

  document.getElementById("exerciseName").value = "";

  save();
  renderExercises();
}

function renderExercises() {
  const dayIndex = document.getElementById("daySelect").value;
  const list = document.getElementById("exerciseList");

  list.innerHTML = "";

  if (!data[dayIndex]) return;

  data[dayIndex].exercises.forEach((ex, i) => {
    const li = document.createElement("li");

    li.textContent = ex.name;

    if (i === currentExercise) {
      li.classList.add("active");
    }

    li.onclick = () => {
      currentExercise = i;
      renderExercises();
      renderHistory(i);

      showToast("Ejercicio: " + ex.name);
    };

    list.appendChild(li);
  });
}

// 🔹 HISTORIAL + STATS
function renderHistory(exIndex) {
  currentExercise = exIndex;

  const exercise = data[dayIndex].exercises[exIndex];
  const setsDone = exercise.history.length % exercise.targetSets || 0;
  const seriesInfo = document.createElement("li");

  seriesInfo.innerHTML = `📊 Serie ${setsDone + 1} / ${exercise.targetSets}`;
  seriesInfo.classList.add("active");
  
  historyList.appendChild(seriesInfo);

  const dayIndex = document.getElementById("daySelect").value;
  const historyList = document.getElementById("history");

  historyList.innerHTML = "";

  const history = exercise.history;

  const stats = calculateStats(history);
  const suggestion = getSuggestion(history);

  // 🔥 Autocompletar último set
  if (stats) {
    document.getElementById("weight").value = stats.last.weight;
    document.getElementById("reps").value = stats.last.reps;
    document.getElementById("weight").focus();
  }

  // 📊 STATS
  if (stats) {
    const statsBox = document.createElement("li");

    statsBox.innerHTML = `
      🏆 PR: ${stats.bestWeight} kg <br>
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

// 🔹 REGISTRO
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
  document.getElementById("weight").focus();

  if (isPR) {
    showToast("🔥 Nuevo récord!");
  }

  if (guidedMode) {
    moveToNextExercise();
  }
  if (guidedMode) {
    handleSetProgress();
  }
  startTimer();
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

// 📊 STATS
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

// 🧠 SUGERENCIA
function getSuggestion(history) {
  if (history.length === 0) return null;

  const last = history[history.length - 1];

  let suggestedWeight = last.weight;

  if (last.reps >= 10) suggestedWeight += 2.5;
  else if (last.reps >= 6) suggestedWeight += 1.25;

  return { weight: suggestedWeight, reps: last.reps };
}

// ⏱️ TIMER
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

      const audio = new Audio("https://www.soundjay.com/buttons/beep-07.wav");
      audio.play();

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

// 🔔 TOAST
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// ⚡ ATAJOS TECLADO (clave en uso real)
document.getElementById("weight").addEventListener("keypress", e => {
  if (e.key === "Enter") document.getElementById("reps").focus();
});

document.getElementById("reps").addEventListener("keypress", e => {
  if (e.key === "Enter") addRecord();
});

// ⏱️ QUICK REST
function quickRest(seconds) {
  document.getElementById("restTime").value = seconds;
  startTimer();
}

// 📤 EXPORT JSON
function exportJSON() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();

  showToast("Backup exportado");
}

// 📥 IMPORT JSON
function importJSON(event) {
  if (!confirm("Esto reemplazará tus datos actuales")) return;

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
      showToast("Error al importar");
    }
  };

  reader.readAsText(file);
}

// 📊 EXPORT CSV
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

  showToast("Exportado a Excel");
}

// 📈 GRÁFICO
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
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "white" } }
      },
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } }
      }
    }
  });
}

function startGuidedMode() {
  const dayIndex = document.getElementById("daySelect").value;

  if (!data[dayIndex] || data[dayIndex].exercises.length === 0) {
    showToast("No hay ejercicios en este día");
    return;
  }

  guidedMode = true;
  guidedIndex = 0;

  currentExercise = 0;

  renderExercises();
  renderHistory(0);

  showToast("🔥 Rutina iniciada");
}

function handleSetProgress() {
  const dayIndex = document.getElementById("daySelect").value;
  const exercise = data[dayIndex].exercises[currentExercise];

  const totalSetsDone = exercise.history.length;
  const setsInThisExercise = totalSetsDone % exercise.targetSets;

  if (setsInThisExercise !== 0) {
    showToast(`💪 Serie ${setsInThisExercise}/${exercise.targetSets}`);
  } else {
    showToast("✅ Ejercicio completado");
    moveToNextExercise();
  }
}

// INIT
renderDays();