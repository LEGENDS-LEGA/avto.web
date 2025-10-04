const saveForm = document.getElementById("saveForm");
const saveResult = document.getElementById("saveResult");
const searchForm = document.getElementById("searchForm");
const searchResults = document.getElementById("searchResults");
const allPlates = document.getElementById("allPlates");
const refreshListBtn = document.getElementById("refreshList");

saveForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveResult.textContent = "Загрузка...";
  const plate = document.getElementById("plate").value.trim();
  const photo = document.getElementById("photo").files[0];
  if (!plate || !photo) { saveResult.textContent = "Заполните все поля"; return; }

  const fd = new FormData();
  fd.append("plate", plate);
  fd.append("file", photo);
  try {
    const res = await fetch("/api/save", { method: "POST", body: fd });
    const j = await res.json();
    if (j.ok) {
      saveResult.textContent = "Сохранено ✅";
      saveForm.reset();
      loadAllPlates();
    } else {
      saveResult.textContent = "Ошибка: " + (j.detail || JSON.stringify(j));
    }
  } catch (err) {
    saveResult.textContent = "Ошибка сети: " + err.message;
  }
});

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  searchResults.innerHTML = "Поиск...";
  const plate = document.getElementById("searchPlate").value.trim();
  if (!plate) { searchResults.textContent = "Введите номер"; return; }
  try {
    const res = await fetch(`/api/search?plate=${encodeURIComponent(plate)}`);
    const j = await res.json();
    if (!j.ok) { searchResults.textContent = "Ошибка"; return; }
    renderResults(j.results);
  } catch (err) {
    searchResults.textContent = "Ошибка: " + err.message;
  }
});

function renderResults(results) {
  if (!results.length) {
    searchResults.innerHTML = "<p>Ничего не найдено</p>";
    return;
  }
  searchResults.innerHTML = "";
  results.forEach(r => {
    const card = document.createElement("div");
    card.className = "photo-card";
    const img = document.createElement("img");
    img.src = r.image_base64;
    img.alt = r.filename || r.id;
    const cap = document.createElement("div");
    cap.className = "caption";
    cap.textContent = `${r.plate} • ${new Date(r.created_at).toLocaleString()}`;
    card.appendChild(img);
    card.appendChild(cap);
    searchResults.appendChild(card);
  });
}

async function loadAllPlates(){
  allPlates.textContent = "Загрузка...";
  try {
    const res = await fetch("/api/list");
    const j = await res.json();
    if (!j.ok) { allPlates.textContent = "Ошибка"; return; }
    if (!j.plates.length) { allPlates.textContent = "Список пуст"; return; }
    allPlates.innerHTML = "";
    j.plates.sort().forEach(p => {
      const el = document.createElement("div");
      el.className = "plate-item";
      el.textContent = p;
      el.addEventListener("click", () => {
        document.getElementById("searchPlate").value = p;
        searchForm.dispatchEvent(new Event("submit"));
      });
      allPlates.appendChild(el);
    });
  } catch (err) {
    allPlates.textContent = "Ошибка: " + err.message;
  }
}

refreshListBtn.addEventListener("click", loadAllPlates);

// Load on start
loadAllPlates();
static/styles.css
