const API_URL = "https://recipe-api.nishchay-s.workers.dev";
const FALLBACK_URL = "recipes.json";

const state = {
  recipes: [],
  selectedRecipeId: null,
  editingRecipeId: null,
  formIngredients: [],
  formSteps: [],
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
  dictationLang: document.querySelector("#dictationLang"),
  dictationStatus: document.querySelector("#dictationStatus"),
};

function hasApiUrl() {
  return API_URL && !API_URL.includes("<subdomain>");
}

function reportIssue(message) {
  if (message) {
    console.warn(message);
  }
}

function normalizeTags(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

  if (!query) {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }

  return filtered
    .filter((recipe) => {
      const searchable = [
        recipe.title,
        recipe.time,
        recipe.notes,
        ...(recipe.tags || []),
        ...(recipe.ingredients || []),
        ...(recipe.instructions || []),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    })
    .sort((a, b) => a.title.localeCompare(b.title));
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
    const firstLetter = recipe.title ? recipe.title.charAt(0).toUpperCase() : "?";
    
    if (state.activeTab === "all" && firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      html += `<div class="toc-divider">${escapeHtml(currentLetter)}</div>`;
    }

    html += `
      <button class="toc-recipe${activeClass}" type="button" data-id="${escapeHtml(recipe.id)}">
        <span class="toc-title">${escapeHtml(recipe.title)}</span>
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
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }
}

function closeDialog(dialog) {
  if (dialog.open) {
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
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
  if (pushState) {
    history.pushState({ recipeId: recipe.id }, "", `#recipe-${recipe.id}`);
  }
  elements.pageTurner.classList.remove("is-flipping");
  void elements.pageTurner.offsetWidth;
  elements.pageTurner.classList.add("is-flipping");

  window.setTimeout(() => {
    renderSelectedRecipe(recipe);
  }, 360);

  window.setTimeout(() => {
    if (elements.pageTurner) elements.pageTurner.classList.remove("is-flipping");
  }, 750);

  renderRecipes();
}

function renderSelectedRecipe(recipe) {
  if (elements.book) elements.book.classList.add("is-recipe-open");
  elements.tocPage.hidden = true;
  elements.recipePage.hidden = false;
  elements.recipeTitle.textContent = recipe.title || "Untitled Recipe";
  elements.recipeMeta.textContent = recipe.time || "Time not set";
  elements.recipeTags.innerHTML = renderTags(recipe.tags || []);
  setListItems(elements.recipeIngredients, recipe.ingredients || []);
  setListItems(elements.recipeInstructions, recipe.instructions || []);
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

function flipToContents() {
  elements.pageTurner.classList.remove("is-flipping");
  void elements.pageTurner.offsetWidth;
  elements.pageTurner.classList.add("is-flipping");

  window.setTimeout(() => {
    showTableOfContents();
  }, 360);

  window.setTimeout(() => {
    if (elements.pageTurner) elements.pageTurner.classList.remove("is-flipping");
  }, 750);
}

function showTableOfContents() {
  if (elements.book) elements.book.classList.remove("is-recipe-open");
  state.selectedRecipeId = null;
  history.pushState({}, "", window.location.pathname);
  elements.tocPage.hidden = false;
  elements.recipePage.hidden = true;
  renderRecipes();
}

// --- Drag & Drop / Edit List Logic ---
let draggedItemInfo = null;

function renderItemList(listElement, items, type) {
  listElement.innerHTML = items
    .map(
      (item, index) => `
        <li class="item-row" draggable="true" data-type="${type}" data-index="${index}" style="display: flex; gap: 10px; align-items: center; cursor: grab; padding: 4px 0;">
          <span class="drag-handle" style="color: #888; cursor: grab; user-select: none;" title="Drag to reorder">≡</span>
          <span style="flex-grow: 1;">${escapeHtml(item)}</span>
          <button class="secondary-button small" type="button" data-action="edit" data-type="${type}" data-index="${index}" title="Edit item" style="padding: 2px 6px;">✏️</button>
          <button class="danger-button small" type="button" data-action="remove" data-type="${type}" data-index="${index}" title="Remove item" style="padding: 2px 6px;">❌</button>
        </li>
      `,
    )
    .join("");
}

function handleListAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const type = button.dataset.type;
  const index = Number(button.dataset.index);

  if (action === "remove") {
    removeFormItem(type, index);
  } else if (action === "edit") {
    const list = type === "ingredient" ? state.formIngredients : state.formSteps;
    const input = type === "ingredient" ? elements.ingredientInput : elements.stepInput;
    
    input.value = list[index];
    removeFormItem(type, index);
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

  listElement.addEventListener("dragover", (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  });

  listElement.addEventListener("drop", (e) => {
    e.preventDefault();
    const targetLi = e.target.closest("li");
    if (!targetLi || !draggedItemInfo) return;

    const targetIndex = Number(targetLi.dataset.index);
    const list = draggedItemInfo.type === "ingredient" ? state.formIngredients : state.formSteps;
    
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
// -------------------------------------

function renderFormItems() {
  renderItemList(elements.ingredientsList, state.formIngredients, "ingredient");
  renderItemList(elements.stepsList, state.formSteps, "step");
}

function addFormItem(type) {
  const input = type === "ingredient" ? elements.ingredientInput : elements.stepInput;
  const value = input.value.trim();

  if (!value) {
    input.focus();
    return;
  }

  if (type === "ingredient") {
    state.formIngredients.push(value);
  } else {
    state.formSteps.push(value);
  }

  input.value = "";
  input.focus();
  renderFormItems();
}

function removeFormItem(type, index) {
  if (type === "ingredient") {
    state.formIngredients.splice(index, 1);
  } else {
    state.formSteps.splice(index, 1);
  }
  renderFormItems();
}

function resetForm() {
  elements.form.reset();
  state.editingRecipeId = null;
  state.formIngredients = [];
  state.formSteps = [];
  elements.formTitle.textContent = "New Recipe";
  if (elements.photoPreviewContainer) {
    elements.photoPreviewContainer.style.backgroundImage = "none";
    if (elements.photoPlaceholderText) elements.photoPlaceholderText.hidden = false;
  }
  renderFormItems();
}

function openForm(recipe = null) {
  resetForm();

  if (recipe) {
    state.editingRecipeId = recipe.id;
    elements.formTitle.textContent = "Update Recipe";
    elements.titleInput.value = recipe.title || "";
    elements.tagsInput.value = (recipe.tags || []).join(", ");
    if (elements.photoInput) {
      elements.photoInput.value = recipe.photo || "";
      if (recipe.photo && elements.photoPreviewContainer) {
        elements.photoPreviewContainer.style.backgroundImage = `url("${recipe.photo}")`;
        if (elements.photoPlaceholderText) elements.photoPlaceholderText.hidden = true;
      }
    }
    elements.timeInput.value = recipe.time || "";
    elements.notesInput.value = recipe.notes || "";
    state.formIngredients = [...(recipe.ingredients || [])];
    state.formSteps = [...(recipe.instructions || [])];
    renderFormItems();
  }

  openDialog(elements.formModal);
}

async function loadRecipes() {
  const url = hasApiUrl() ? API_URL : FALLBACK_URL;
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Could not load recipes (${response.status})`);
  }

  state.recipes = await response.json();
  state.usingFallback = !hasApiUrl();

  if (state.selectedRecipeId) {
    const selectedRecipe = getSelectedRecipe();
    if (selectedRecipe) {
      renderSelectedRecipe(selectedRecipe);
    } else {
      showTableOfContents();
    }
  }

  renderRecipes();
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

    if (!response.ok) {
      throw new Error(`Could not save recipes (${response.status})`);
    }

    state.recipes = nextRecipes;
    renderRecipes();
  } finally {
    setLoading(false);
  }
}

function buildRecipeFromForm() {
  return {
    id: state.editingRecipeId || Date.now(),
    title: elements.titleInput.value.trim(),
    tags: normalizeTags(elements.tagsInput.value),
    photo: elements.photoInput ? elements.photoInput.value.trim() : "",
    time: elements.timeInput.value.trim(),
    ingredients: [...state.formIngredients],
    instructions: [...state.formSteps],
    notes: elements.notesInput.value.trim(),
  };
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!state.formIngredients.length) {
    reportIssue("Add at least one ingredient.");
    elements.ingredientInput.focus();
    return;
  }

  if (!state.formSteps.length) {
    reportIssue("Add at least one step.");
    elements.stepInput.focus();
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

async function handleDelete() {
  const recipe = getSelectedRecipe();

  if (!recipe || !confirm(`Delete "${recipe.title}"?`)) {
    return;
  }

  const nextRecipes = state.recipes.filter((item) => String(item.id) !== String(recipe.id));
  await saveRecipes(nextRecipes);
  flipToContents();
}

elements.addRecipeButton.addEventListener("click", () => openForm());
elements.addIngredientButton.addEventListener("click", () => addFormItem("ingredient"));
elements.addStepButton.addEventListener("click", () => addFormItem("step"));
elements.ingredientInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addFormItem("ingredient");
  }
});
elements.stepInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addFormItem("step");
  }
});

function processImageFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = Math.floor((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      
      if (elements.photoInput) elements.photoInput.value = dataUrl;
      if (elements.photoPreviewContainer) {
        elements.photoPreviewContainer.style.backgroundImage = `url("${dataUrl}")`;
        if (elements.photoPlaceholderText) elements.photoPlaceholderText.hidden = true;
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

elements.photoPreviewContainer?.addEventListener("click", () => {
  elements.photoFileInput?.click();
});

elements.photoFileInput?.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    processImageFile(file);
  }
});

elements.cancelFormButton.addEventListener("click", () => closeDialog(elements.formModal));
elements.backToContentsButton.addEventListener("click", flipToContents);
elements.deleteRecipeButton.addEventListener("click", handleDelete);
elements.editRecipeButton.addEventListener("click", () => openForm(getSelectedRecipe()));

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => { button.textContent = original; }, 1500);
}

elements.shareLinkButton?.addEventListener("click", () => {
  const recipe = getSelectedRecipe();
  if (!recipe) return;
  const url = `${window.location.origin}${window.location.pathname}#recipe-${encodeURIComponent(recipe.id)}`;
  navigator.clipboard.writeText(url).then(() => {
    flashButton(elements.shareLinkButton, "✓ Copied!");
  }).catch(() => {
    prompt("Copy this link:", url);
  });
});

elements.shareRecipeButton?.addEventListener("click", () => {
  const recipe = getSelectedRecipe();
  if (!recipe) return;
  let text = `🍽️ ${recipe.title}\n`;
  if (recipe.time) text += `⏱️ ${recipe.time}\n`;
  if (recipe.tags?.length) text += `🏷️ ${recipe.tags.join(", ")}\n`;
  text += `\n📝 Ingredients:\n`;
  (recipe.ingredients || []).forEach(i => { text += `• ${i}\n`; });
  text += `\n👩‍🍳 Steps:\n`;
  (recipe.instructions || []).forEach((s, idx) => { text += `${idx + 1}. ${s}\n`; });
  if (recipe.notes) text += `\n📌 Notes: ${recipe.notes}\n`;
  text += `\n— From our Recipe Book`;
  navigator.clipboard.writeText(text).then(() => {
    flashButton(elements.shareRecipeButton, "✓ Copied!");
  }).catch(() => {
    prompt("Copy this recipe:", text);
  });
});

function setLoading(on) {
  state.isSaving = on;
  if (elements.loadingOverlay) {
    elements.loadingOverlay.hidden = !on;
  }
  if (elements.saveButton) {
    elements.saveButton.disabled = on;
    elements.saveButton.textContent = on ? "Saving…" : "Save";
  }
}

window.addEventListener("popstate", () => {
  const hash = window.location.hash;
  if (hash.startsWith("#recipe-")) {
    const id = decodeURIComponent(hash.replace("#recipe-", ""));
    const recipe = state.recipes.find(r => String(r.id) === String(id));
    if (recipe) {
      flipToRecipe(recipe, false);
      return;
    }
  }
  showTableOfContents();
});

function navigateToHashRecipe() {
  const hash = window.location.hash;
  if (hash.startsWith("#recipe-")) {
    const id = decodeURIComponent(hash.replace("#recipe-", ""));
    const recipe = state.recipes.find(r => String(r.id) === String(id));
    if (recipe) {
      flipToRecipe(recipe, false);
    }
  }
}

elements.form.addEventListener("submit", handleSubmit);
elements.refreshButton.addEventListener("click", () => loadRecipes().catch((error) => reportIssue(error.message)));
elements.searchInput.addEventListener("input", () => {
  renderRecipes();
  if (state.selectedRecipeId && !getFilteredRecipes().some((recipe) => String(recipe.id) === String(state.selectedRecipeId))) {
    showTableOfContents();
  } else if (!state.selectedRecipeId) {
    showTableOfContents();
  }
});
elements.tocTabs?.addEventListener("click", (event) => {
  if (event.target.classList.contains("tab")) {
    state.activeTab = event.target.dataset.tag;
    renderRecipes();
  }
});
elements.recipeList.addEventListener("click", (event) => {
  const item = event.target.closest(".toc-recipe");
  if (!item) return;
  const recipe = state.recipes.find((entry) => String(entry.id) === String(item.dataset.id));
  if (recipe) flipToRecipe(recipe);
});

// --- AI & Dictation Logic (Proxy through Worker) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = false;

  elements.dictateButton?.addEventListener("click", () => {
    recognition.lang = elements.dictationLang.value;
    recognition.start();
    elements.dictationStatus.textContent = "Listening... (Speak your recipe now)";
    elements.dictationStatus.hidden = false;
    elements.dictateButton.disabled = true;
  });

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    elements.dictationStatus.textContent = "Parsing with AI...";
    await parseRecipeWithGemini(transcript);
  };

  recognition.onerror = (event) => {
    elements.dictationStatus.textContent = `Speech recognition error: ${event.error}`;
    elements.dictateButton.disabled = false;
    setTimeout(() => { elements.dictationStatus.hidden = true; }, 3000);
  };

  recognition.onend = () => {
    elements.dictateButton.disabled = false;
  };
} else if (elements.dictateButton) {
  elements.dictateButton.style.display = "none";
  console.warn("Web Speech API is not supported in this browser.");
}

async function callGeminiAPI(promptText) {
  const url = `${API_URL}/api/ai`; 
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: promptText })
  });

  if (!response.ok) throw new Error("Failed to communicate with the server.");
  
  return await response.json();
}

async function parseRecipeWithGemini(spokenText) {
  try {
    const prompt = `
      You are an expert culinary assistant. Parse the following spoken text into a structured recipe. 
      Return ONLY a raw JSON object with the following keys:
      - "title": string (infer a good title if not explicitly stated)
      - "ingredients": array of strings (standardize measurements if possible)
      - "instructions": array of strings (chronological steps)
      
      Spoken text: "${spokenText}"
    `;

    const parsedData = await callGeminiAPI(prompt);
    
    elements.titleInput.value = parsedData.title || elements.titleInput.value;
    state.formIngredients = parsedData.ingredients || state.formIngredients;
    state.formSteps = parsedData.instructions || state.formSteps;
    renderFormItems();
    
    elements.dictationStatus.textContent = "✨ Recipe loaded successfully!";
    setTimeout(() => { elements.dictationStatus.hidden = true; }, 3000);
  } catch (error) {
    elements.dictationStatus.textContent = "Error parsing recipe. Try again.";
    console.error(error);
  }
}

elements.translateButton?.addEventListener("click", async () => {
  const currentRecipe = {
    title: elements.titleInput.value,
    ingredients: state.formIngredients,
    instructions: state.formSteps
  };

  elements.dictationStatus.textContent = "Translating to Gujarati...";
  elements.dictationStatus.hidden = false;
  elements.translateButton.disabled = true;

  try {
    const prompt = `
      Translate the following recipe object flawlessly into Gujarati. 
      Keep the exact same JSON structure. Return ONLY valid JSON.
      
      ${JSON.stringify(currentRecipe)}
    `;

    const translatedData = await callGeminiAPI(prompt);
    
    elements.titleInput.value = translatedData.title || elements.titleInput.value;
    state.formIngredients = translatedData.ingredients || state.formIngredients;
    state.formSteps = translatedData.instructions || state.formSteps;
    renderFormItems();

    elements.dictationStatus.textContent = "🌐 Translated successfully!";
  } catch (error) {
    elements.dictationStatus.textContent = "Translation failed.";
    console.error(error);
  } finally {
    setTimeout(() => { elements.dictationStatus.hidden = true; }, 3000);
    elements.translateButton.disabled = false;
  }
});

loadRecipes().then(() => {
  navigateToHashRecipe();
}).catch((error) => {
  reportIssue(error.message);
  elements.emptyState.hidden = false;
});
