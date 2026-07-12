const API_URL = "https://recipe-api.nishchay-s.workers.dev";
const FALLBACK_URL = "recipes.json";

const state = {
  recipes: [],
  selectedRecipeId: null,
  editingRecipeId: null,
  
  // Dual-Language State
  formTitle: { en: "", gu: "" },
  formIngredients: { en: [], gu: [] },
  formSteps: { en: [], gu: [] },
  formLang: "en", 
  viewLang: "en", 
  
  usingFallback: false,
  activeTab: "all",
  isSaving: false,
};

const elements = {
  addIngredientButton: document.querySelector("#addIngredientButton"),
  addRecipeButton: document.querySelector("#addRecipeButton"),
  addStepButton: document.querySelector("#addStepButton"),
  backToContentsButton: document.querySelector("#backToContentsButton"),
  book: document.querySelector(".book"),
  bookStage: document.querySelector("#bookStage"),
  cancelFormButton: document.querySelector("#cancelFormButton"),
  coverPage: document.querySelector("#coverPage"),
  deleteRecipeButton: document.querySelector("#deleteRecipeButton"),
  editRecipeButton: document.querySelector("#editRecipeButton"),
  emptyState: document.querySelector("#emptyState"),
  form: document.querySelector("#recipeForm"),
  formModal: document.querySelector("#formModal"),
  formTitle: document.querySelector("#formTitle"),
  ingredientInput: document.querySelector("#ingredientInput"),
  ingredientsList: document.querySelector("#ingredientsList"),
  notesInput: document.querySelector("#notesInput"),
  pageTurner: document.querySelector("#pageTurner"),
  recipeIngredients: document.querySelector("#recipeIngredients"),
  recipeInstructions: document.querySelector("#recipeInstructions"),
  recipeList: document.querySelector("#recipeList"),
  recipeMeta: document.querySelector("#recipeMeta"),
  recipeNotes: document.querySelector("#recipeNotes"),
  recipeNotesSection: document.querySelector("#recipeNotesSection"),
  recipePage: document.querySelector("#recipePage"),
  recipeTags: document.querySelector("#recipeTags"),
  recipeTitle: document.querySelector("#recipeTitle"),
  refreshButton: document.querySelector("#refreshButton"),
  searchInput: document.querySelector("#searchInput"),
  shareLinkButton: document.querySelector("#shareLinkButton"),
  shareRecipeButton: document.querySelector("#shareRecipeButton"),
  stepInput: document.querySelector("#stepInput"),
  stepsList: document.querySelector("#stepsList"),
  tagsInput: document.querySelector("#tagsInput"),
  photoInput: document.querySelector("#photoInput"),
  photoFileInput: document.querySelector("#photoFileInput"),
  photoPreviewContainer: document.querySelector("#photoPreviewContainer"),
  photoPlaceholderText: document.querySelector("#photoPlaceholderText"),
  timeInput: document.querySelector("#timeInput"),
  titleInput: document.querySelector("#titleInput"),
  tocPage: document.querySelector("#tocPage"),
  tocTabs: document.querySelector("#tocTabs"),
  saveButton: document.querySelector("#saveButton"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  
  // AI Elements
  dictateButton: document.querySelector("#dictateButton"),
  translateButton: document.querySelector("#translateButton"),
  viewTranslateButton: document.querySelector("#viewTranslateButton"),
  dictationStatus: document.querySelector("#dictationStatus"),
};

function hasApiUrl() {
  return API_URL && !API_URL.includes("<subdomain>");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFilteredRecipes() {
  const query = elements.searchInput.value.trim().toLowerCase();
  let filtered = state.recipes;

  if (state.activeTab !== "all") {
    filtered = filtered.filter(recipe => (recipe.tags || []).includes(state.activeTab));
  }

  if (!query) return [...filtered].sort((a, b) => a.title.localeCompare(b.title));

  return filtered.filter((recipe) => {
    const searchable = [
      recipe.title, recipe.title_gu, recipe.time, recipe.notes,
      ...(recipe.tags || []),
      ...(recipe.ingredients || []), ...(recipe.ingredients_gu || []),
      ...(recipe.instructions || []), ...(recipe.instructions_gu || [])
    ].join(" ").toLowerCase();
    return searchable.includes(query);
  }).sort((a, b) => a.title.localeCompare(b.title));
}

function renderTags(tags = []) {
  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function renderTabs() {
  if (!elements.tocTabs) return;
  const tags = new Set();
  state.recipes.forEach(recipe => {
    (recipe.tags || []).forEach(tag => tags.add(tag));
  });
  
  const sortedTags = Array.from(tags).sort();
  let html = `<button class="tab ${state.activeTab === 'all' ? 'is-active' : ''}" data-tag="all">All</button>`;
  sortedTags.forEach(tag => {
    html += `<button class="tab ${state.activeTab === tag ? 'is-active' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
  });
  elements.tocTabs.innerHTML = html;
}

function renderRecipes() {
  const recipes = getFilteredRecipes();
  let currentLetter = "";
  let html = "";
  
  recipes.forEach((recipe, index) => {
    const activeClass = String(recipe.id) === String(state.selectedRecipeId) ? " is-active" : "";
    const displayTitle = state.viewLang === 'gu' && recipe.title_gu ? recipe.title_gu : recipe.title;
    const firstLetter = displayTitle ? displayTitle.charAt(0).toUpperCase() : "?";
    
    if (state.activeTab === "all" && firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      html += `<div class="toc-divider">${escapeHtml(currentLetter)}</div>`;
    }

    html += `
      <button class="toc-recipe${activeClass}" type="button" data-id="${escapeHtml(recipe.id)}">
        <span class="toc-title">${escapeHtml(displayTitle)}</span>
        <span class="toc-dots"></span>
        <span class="toc-number">${String(index + 1).padStart(2, "0")}</span>
      </button>
    `;
  });

  elements.recipeList.innerHTML = html;
  elements.emptyState.hidden = recipes.length > 0;
  renderTabs();
}

function openDialog(dialog) {
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog) {
  if (dialog.open) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }
}

function getSelectedRecipe() {
  return state.recipes.find((recipe) => String(recipe.id) === String(state.selectedRecipeId));
}

function setListItems(element, items = []) {
  element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function flipToRecipe(recipe, pushState = true) {
  state.selectedRecipeId = recipe.id;
  state.viewLang = 'en'; // Default to English when opening
  if (pushState) history.pushState({ recipeId: recipe.id }, "", `#recipe-${recipe.id}`);
  
  elements.pageTurner.classList.remove("is-flipping");
  void elements.pageTurner.offsetWidth;
  elements.pageTurner.classList.add("is-flipping");

  window.setTimeout(() => renderSelectedRecipe(recipe), 360);
  window.setTimeout(() => elements.pageTurner.classList.remove("is-flipping"), 750);
  renderRecipes();
}

function renderSelectedRecipe(recipe) {
  if (elements.book) elements.book.classList.add("is-recipe-open");
  elements.tocPage.hidden = true;
  elements.recipePage.hidden = false;
  
  // Handle Dual Language View Toggle
  const hasGujarati = !!recipe.title_gu || (recipe.ingredients_gu && recipe.ingredients_gu.length > 0);
  elements.viewTranslateButton.hidden = !hasGujarati;
  elements.viewTranslateButton.textContent = state.viewLang === 'en' ? '🌐 View in Gujarati' : '🌐 View in English';

  // Apply Content
  elements.recipeTitle.textContent = (state.viewLang === 'gu' && recipe.title_gu) ? recipe.title_gu : (recipe.title || "Untitled Recipe");
  elements.recipeMeta.textContent = recipe.time || "Time not set";
  elements.recipeTags.innerHTML = renderTags(recipe.tags || []);
  
  const activeIngredients = (state.viewLang === 'gu' && recipe.ingredients_gu && recipe.ingredients_gu.length) ? recipe.ingredients_gu : (recipe.ingredients || []);
  const activeInstructions = (state.viewLang === 'gu' && recipe.instructions_gu && recipe.instructions_gu.length) ? recipe.instructions_gu : (recipe.instructions || []);
  
  setListItems(elements.recipeIngredients, activeIngredients);
  setListItems(elements.recipeInstructions, activeInstructions);
  elements.recipeNotes.textContent = recipe.notes || "";
  elements.recipeNotesSection.hidden = !recipe.notes;

  const rightPage = document.querySelector(".right-page");
  if (rightPage) {
    if (recipe.photo) {
      rightPage.style.setProperty("--recipe-photo", `url("${recipe.photo}")`);
      rightPage.classList.add("has-photo");
    } else {
      rightPage.style.removeProperty("--recipe-photo");
      rightPage.classList.remove("has-photo");
    }
  }
}

elements.viewTranslateButton.addEventListener("click", () => {
  const recipe = getSelectedRecipe();
  if (!recipe) return;
  state.viewLang = state.viewLang === 'en' ? 'gu' : 'en';
  renderSelectedRecipe(recipe);
  renderRecipes(); // Update TOC names
});

function flipToContents() {
  elements.pageTurner.classList.remove("is-flipping");
  void elements.pageTurner.offsetWidth;
  elements.pageTurner.classList.add("is-flipping");

  window.setTimeout(() => showTableOfContents(), 360);
  window.setTimeout(() => elements.pageTurner.classList.remove("is-flipping"), 750);
}

function showTableOfContents() {
  if (elements.book) elements.book.classList.remove("is-recipe-open");
  state.selectedRecipeId = null;
  history.pushState({}, "", window.location.pathname);
  elements.tocPage.hidden = false;
  elements.recipePage.hidden = true;
  renderRecipes();
}

// --- DUAL LANGUAGE FORM LOGIC ---

function syncInputsToState() {
  state.formTitle[state.formLang] = elements.titleInput.value.trim();
}

function syncStateToInputs() {
  elements.titleInput.value = state.formTitle[state.formLang] || "";
  renderFormItems();
}

let draggedItemInfo = null;

function renderItemList(listElement, items, type) {
  listElement.innerHTML = items.map((item, index) => `
    <li class="item-row" draggable="true" data-type="${type}" data-index="${index}" style="display: flex; gap: 10px; align-items: center; cursor: grab; padding: 4px 0;">
      <span class="drag-handle" style="color: #888; cursor: grab; user-select: none;">≡</span>
      <span style="flex-grow: 1;">${escapeHtml(item)}</span>
      <button class="secondary-button small" type="button" data-action="edit" data-type="${type}" data-index="${index}" style="padding: 2px 6px;">✏️</button>
      <button class="danger-button small" type="button" data-action="remove" data-type="${type}" data-index="${index}" style="padding: 2px 6px;">❌</button>
    </li>
  `).join("");
}

function handleListAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const type = button.dataset.type;
  const index = Number(button.dataset.index);
  const list = type === "ingredient" ? state.formIngredients[state.formLang] : state.formSteps[state.formLang];

  if (action === "remove") {
    list.splice(index, 1);
    renderFormItems();
  } else if (action === "edit") {
    const input = type === "ingredient" ? elements.ingredientInput : elements.stepInput;
    input.value = list[index];
    list.splice(index, 1);
    renderFormItems();
    input.focus();
  }
}

function setupDragAndDrop(listElement) {
  listElement.addEventListener("dragstart", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    draggedItemInfo = { type: li.dataset.type, index: Number(li.dataset.index) };
    e.dataTransfer.effectAllowed = "move";
    li.style.opacity = "0.5";
  });
  listElement.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
  listElement.addEventListener("drop", (e) => {
    e.preventDefault();
    const targetLi = e.target.closest("li");
    if (!targetLi || !draggedItemInfo) return;
    const targetIndex = Number(targetLi.dataset.index);
    const list = draggedItemInfo.type === "ingredient" ? state.formIngredients[state.formLang] : state.formSteps[state.formLang];
    
    const [movedItem] = list.splice(draggedItemInfo.index, 1);
    list.splice(targetIndex, 0, movedItem);
    renderFormItems();
    draggedItemInfo = null;
  });
  listElement.addEventListener("dragend", (e) => {
    if (e.target.closest("li")) e.target.closest("li").style.opacity = "1";
  });
}

elements.ingredientsList.addEventListener("click", handleListAction);
elements.stepsList.addEventListener("click", handleListAction);
setupDragAndDrop(elements.ingredientsList);
setupDragAndDrop(elements.stepsList);

function renderFormItems() {
  renderItemList(elements.ingredientsList, state.formIngredients[state.formLang] || [], "ingredient");
  renderItemList(elements.stepsList, state.formSteps[state.formLang] || [], "step");
}

function addFormItem(type) {
  const input = type === "ingredient" ? elements.ingredientInput : elements.stepInput;
  const value = input.value.trim();
  if (!value) { input.focus(); return; }

  if (type === "ingredient") state.formIngredients[state.formLang].push(value);
  else state.formSteps[state.formLang].push(value);

  input.value = "";
  input.focus();
  renderFormItems();
}

elements.ingredientInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addFormItem("ingredient"); }});
elements.stepInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addFormItem("step"); }});
elements.addIngredientButton.addEventListener("click", () => addFormItem("ingredient"));
elements.addStepButton.addEventListener("click", () => addFormItem("step"));
elements.titleInput.addEventListener("blur", syncInputsToState);

function resetForm() {
  elements.form.reset();
  state.editingRecipeId = null;
  state.formLang = "en";
  state.formTitle = { en: "", gu: "" };
  state.formIngredients = { en: [], gu: [] };
  state.formSteps = { en: [], gu: [] };
  
  elements.formTitle.textContent = "New Recipe";
  elements.translateButton.textContent = "🌐 Translate to Gujarati";
  
  if (elements.photoPreviewContainer) {
    elements.photoPreviewContainer.style.backgroundImage = "none";
    if (elements.photoPlaceholderText) elements.photoPlaceholderText.hidden = false;
  }
  syncStateToInputs();
}

function openForm(recipe = null) {
  resetForm();
  if (recipe) {
    state.editingRecipeId = recipe.id;
    elements.formTitle.textContent = "Update Recipe";
    
    state.formTitle = { en: recipe.title || "", gu: recipe.title_gu || "" };
    state.formIngredients = { en: [...(recipe.ingredients || [])], gu: [...(recipe.ingredients_gu || [])] };
    state.formSteps = { en: [...(recipe.instructions || [])], gu: [...(recipe.instructions_gu || [])] };
    
    elements.tagsInput.value = (recipe.tags || []).join(", ");
    elements.timeInput.value = recipe.time || "";
    elements.notesInput.value = recipe.notes || "";
    
    if (elements.photoInput) {
      elements.photoInput.value = recipe.photo || "";
      if (recipe.photo && elements.photoPreviewContainer) {
        elements.photoPreviewContainer.style.backgroundImage = `url("${recipe.photo}")`;
        if (elements.photoPlaceholderText) elements.photoPlaceholderText.hidden = true;
      }
    }
    syncStateToInputs();
  }
  openDialog(elements.formModal);
}

// --- CORE API & SAVING ---
async function loadRecipes() {
  const url = hasApiUrl() ? API_URL : FALLBACK_URL;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errText}`);
    }
    state.recipes = await response.json();
    state.usingFallback = !hasApiUrl();

    if (state.selectedRecipeId) {
      const selectedRecipe = getSelectedRecipe();
      if (selectedRecipe) renderSelectedRecipe(selectedRecipe);
      else showTableOfContents();
    }
    renderRecipes();
  } catch (err) {
    console.error("Failed to load recipes:", err);
    // Show exact error in UI for debugging
    elements.emptyState.innerHTML = `<h2>Data Error</h2><p style="color:red;">${err.message}</p><p>Check Cloudflare Worker logs.</p>`;
    elements.emptyState.hidden = false;
  }
}

async function saveRecipes(nextRecipes) {
  if (!hasApiUrl()) {
    state.recipes = nextRecipes;
    renderRecipes();
    return;
  }
  setLoading(true);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextRecipes),
    });
    if (!response.ok) throw new Error(`Could not save recipes (${response.status})`);
    state.recipes = nextRecipes;
    renderRecipes();
  } finally {
    setLoading(false);
  }
}

function buildRecipeFromForm() {
  syncInputsToState();
  return {
    id: state.editingRecipeId || Date.now(),
    title: state.formTitle.en || state.formTitle.gu,
    title_gu: state.formTitle.gu,
    tags: normalizeTags(elements.tagsInput.value),
    photo: elements.photoInput ? elements.photoInput.value.trim() : "",
    time: elements.timeInput.value.trim(),
    ingredients: [...(state.formIngredients.en || [])],
    ingredients_gu: [...(state.formIngredients.gu || [])],
    instructions: [...(state.formSteps.en || [])],
    instructions_gu: [...(state.formSteps.gu || [])],
    notes: elements.notesInput.value.trim(),
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  syncInputsToState();

  if (!state.formIngredients[state.formLang].length && !state.formIngredients[state.formLang === 'en' ? 'gu' : 'en'].length) {
    alert("Add at least one ingredient.");
    return;
  }

  const recipe = buildRecipeFromForm();
  const nextRecipes = state.editingRecipeId
    ? state.recipes.map((item) => (String(item.id) === String(state.editingRecipeId) ? recipe : item))
    : [...state.recipes, recipe];

  await saveRecipes(nextRecipes);
  closeDialog(elements.formModal);
  resetForm();
  flipToRecipe(recipe);
}

// --- AI & DICTATION UI INTEGRATION ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = true; 

  elements.dictateButton?.addEventListener("click", () => {
    recognition.lang = "en-US"; 
    recognition.start();
    elements.dictationStatus.textContent = "Listening... 🎤";
    elements.dictationStatus.hidden = false;
    elements.dictateButton.disabled = true;
  });

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map(r => r[0].transcript).join("");
    elements.dictationStatus.textContent = `🎤 "${transcript}"`;
    
    if (event.results[0].isFinal) {
      elements.dictationStatus.textContent = "✨ Parsing and Translating with AI...";
      parseRecipeWithGemini(transcript);
    }
  };

  recognition.onerror = (event) => {
    elements.dictationStatus.textContent = `Speech error: ${event.error}`;
    elements.dictateButton.disabled = false;
    setTimeout(() => { elements.dictationStatus.hidden = true; }, 3000);
  };

  recognition.onend = () => { elements.dictateButton.disabled = false; };
}

async function callGeminiAPI(promptText) {
  const response = await fetch(`${API_URL}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: promptText })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to communicate with AI server");
  return data;
}

async function parseRecipeWithGemini(spokenText) {
  try {
    const prompt = `
      Parse this recipe. Return a JSON object containing BOTH English and Gujarati translations simultaneously.
      Structure MUST exactly match:
      {
        "en": { "title": "...", "ingredients": ["..."], "instructions": ["..."] },
        "gu": { "title": "...", "ingredients": ["..."], "instructions": ["..."] }
      }
      Spoken text: "${spokenText}"
    `;

    const parsedData = await callGeminiAPI(prompt);
    
    if (parsedData && parsedData.en) {
      state.formTitle.en = parsedData.en.title || state.formTitle.en;
      state.formIngredients.en = parsedData.en.ingredients || state.formIngredients.en;
      state.formSteps.en = parsedData.en.instructions || state.formSteps.en;
    }

    if (parsedData && parsedData.gu) {
      state.formTitle.gu = parsedData.gu.title || state.formTitle.gu;
      state.formIngredients.gu = parsedData.gu.ingredients || state.formIngredients.gu;
      state.formSteps.gu = parsedData.gu.instructions || state.formSteps.gu;
    }

    syncStateToInputs();
    
    elements.dictationStatus.textContent = "✨ Recipe loaded in both languages!";
    setTimeout(() => { elements.dictationStatus.hidden = true; }, 3000);
  } catch (error) {
    elements.dictationStatus.textContent = `⚠️ Error: ${error.message}`;
    console.error("AI Error:", error);
    setTimeout(() => { elements.dictationStatus.hidden = true; }, 4000);
  }
}

elements.translateButton?.addEventListener("click", async () => {
  syncInputsToState();
  const targetLang = state.formLang === 'en' ? 'gu' : 'en';
  
  if (!state.formTitle[targetLang] && (!state.formIngredients[targetLang] || state.formIngredients[targetLang].length === 0)) {
    elements.dictationStatus.textContent = `Translating to ${targetLang === 'gu' ? 'Gujarati' : 'English'}...`;
    elements.dictationStatus.hidden = false;
    elements.translateButton.disabled = true;

    try {
      const currentRecipe = {
        title: state.formTitle[state.formLang],
        ingredients: state.formIngredients[state.formLang],
        instructions: state.formSteps[state.formLang]
      };
      
      const prompt = `Translate this JSON object into ${targetLang === 'gu' ? 'Gujarati' : 'English'}. Keep structure exact: ${JSON.stringify(currentRecipe)}`;
      const translatedData = await callGeminiAPI(prompt);
      
      state.formTitle[targetLang] = translatedData.title;
      state.formIngredients[targetLang] = translatedData.ingredients;
      state.formSteps[targetLang] = translatedData.instructions;
    } catch (error) {
      elements.dictationStatus.textContent = "Translation failed.";
      elements.translateButton.disabled = false;
      return;
    }
  }

  state.formLang = targetLang;
  elements.translateButton.textContent = state.formLang === 'en' ? '🌐 Translate to Gujarati' : '🌐 Translate to English';
  syncStateToInputs();
  
  elements.dictationStatus.textContent = `✨ Switched to ${state.formLang === 'gu' ? 'Gujarati' : 'English'}`;
  elements.dictationStatus.hidden = false;
  elements.translateButton.disabled = false;
  setTimeout(() => { elements.dictationStatus.hidden = true; }, 3000);
});

// --- BOILERPLATE EVENT LISTENERS ---
elements.addRecipeButton.addEventListener("click", () => openForm());
elements.cancelFormButton.addEventListener("click", () => closeDialog(elements.formModal));
elements.backToContentsButton.addEventListener("click", flipToContents);
elements.deleteRecipeButton.addEventListener("click", handleDelete);
elements.editRecipeButton.addEventListener("click", () => openForm(getSelectedRecipe()));
elements.form.addEventListener("submit", handleSubmit);
elements.refreshButton.addEventListener("click", () => loadRecipes());

elements.photoPreviewContainer?.addEventListener("click", () => elements.photoFileInput?.click());
elements.photoFileInput?.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) { height = Math.floor((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        if (elements.photoInput) elements.photoInput.value = dataUrl;
        if (elements.photoPreviewContainer) {
          elements.photoPreviewContainer.style.backgroundImage = `url("${dataUrl}")`;
          if (elements.photoPlaceholderText) elements.photoPlaceholderText.hidden = true;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
});

function setLoading(on) {
  state.isSaving = on;
  if (elements.loadingOverlay) elements.loadingOverlay.hidden = !on;
  if (elements.saveButton) { elements.saveButton.disabled = on; elements.saveButton.textContent = on ? "Saving…" : "Save"; }
}

window.addEventListener("popstate", () => {
  const hash = window.location.hash;
  if (hash.startsWith("#recipe-")) {
    const id = decodeURIComponent(hash.replace("#recipe-", ""));
    const recipe = state.recipes.find(r => String(r.id) === String(id));
    if (recipe) { flipToRecipe(recipe, false); return; }
  }
  showTableOfContents();
});

loadRecipes().then(() => {
  const hash = window.location.hash;
  if (hash.startsWith("#recipe-")) {
    const id = decodeURIComponent(hash.replace("#recipe-", ""));
    const recipe = state.recipes.find(r => String(r.id) === String(id));
    if (recipe) flipToRecipe(recipe, false);
  }
});
