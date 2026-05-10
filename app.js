const API_URL = "https://recipe-api.nishchay-s.workers.dev";
const FALLBACK_URL = "recipes.json";

const state = {
  recipes: [],
  selectedRecipeId: null,
  editingRecipeId: null,
  formIngredients: [],
  formSteps: [],
  usingFallback: false,
};

const elements = {
  addIngredientButton: document.querySelector("#addIngredientButton"),
  addRecipeButton: document.querySelector("#addRecipeButton"),
  addStepButton: document.querySelector("#addStepButton"),
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
  stepInput: document.querySelector("#stepInput"),
  stepsList: document.querySelector("#stepsList"),
  tagsInput: document.querySelector("#tagsInput"),
  timeInput: document.querySelector("#timeInput"),
  titleInput: document.querySelector("#titleInput"),
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

  if (!query) {
    return [...state.recipes].sort((a, b) => a.title.localeCompare(b.title));
  }

  return state.recipes
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

function renderRecipes() {
  const recipes = getFilteredRecipes();
  elements.recipeList.innerHTML = recipes
    .map((recipe, index) => {
      const activeClass = String(recipe.id) === String(state.selectedRecipeId) ? " is-active" : "";

      return `
        <button class="toc-recipe${activeClass}" type="button" data-id="${escapeHtml(recipe.id)}">
          <span class="toc-number">${String(index + 1).padStart(2, "0")}</span>
          <span>
            <span class="toc-title">${escapeHtml(recipe.title)}</span>
            <span class="toc-meta">${escapeHtml(recipe.time || "Time not set")}</span>
          </span>
        </button>
      `;
    })
    .join("");

  elements.emptyState.hidden = recipes.length > 0;
}

function openDialog(dialog) {
  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeDialog(dialog) {
  if (dialog.open) {
    dialog.close();
  }
}

function getSelectedRecipe() {
  return state.recipes.find((recipe) => String(recipe.id) === String(state.selectedRecipeId));
}

function setListItems(element, items = []) {
  element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function flipToRecipe(recipe) {
  state.selectedRecipeId = recipe.id;
  elements.pageTurner.classList.remove("is-flipping");
  void elements.pageTurner.offsetWidth;
  elements.pageTurner.classList.add("is-flipping");

  window.setTimeout(() => {
    renderSelectedRecipe(recipe);
  }, 260);

  renderRecipes();
}

function renderSelectedRecipe(recipe) {
  elements.coverPage.hidden = true;
  elements.recipePage.hidden = false;
  elements.recipeTitle.textContent = recipe.title || "Untitled Recipe";
  elements.recipeMeta.textContent = recipe.time || "Time not set";
  elements.recipeTags.innerHTML = renderTags(recipe.tags || []);
  setListItems(elements.recipeIngredients, recipe.ingredients || []);
  setListItems(elements.recipeInstructions, recipe.instructions || []);
  elements.recipeNotes.textContent = recipe.notes || "";
  elements.recipeNotesSection.hidden = !recipe.notes;
}

function showCoverPage() {
  state.selectedRecipeId = null;
  elements.coverPage.hidden = false;
  elements.recipePage.hidden = true;
  renderRecipes();
}

function renderItemList(listElement, items, type) {
  listElement.innerHTML = items
    .map(
      (item, index) => `
        <li class="item-row">
          <span>${escapeHtml(item)}</span>
          <button type="button" data-type="${type}" data-index="${index}">Remove</button>
        </li>
      `,
    )
    .join("");
}

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
  renderFormItems();
}

function openForm(recipe = null) {
  resetForm();

  if (recipe) {
    state.editingRecipeId = recipe.id;
    elements.formTitle.textContent = "Update Recipe";
    elements.titleInput.value = recipe.title || "";
    elements.tagsInput.value = (recipe.tags || []).join(", ");
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
      showCoverPage();
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

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(nextRecipes),
  });

  if (!response.ok) {
    throw new Error(`Could not save recipes (${response.status})`);
  }

  state.recipes = nextRecipes;
  renderRecipes();
}

function buildRecipeFromForm() {
  return {
    id: state.editingRecipeId || Date.now(),
    title: elements.titleInput.value.trim(),
    tags: normalizeTags(elements.tagsInput.value),
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
  showCoverPage();
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
elements.ingredientsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-type]");

  if (button) {
    removeFormItem(button.dataset.type, Number(button.dataset.index));
  }
});
elements.stepsList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-type]");

  if (button) {
    removeFormItem(button.dataset.type, Number(button.dataset.index));
  }
});
elements.cancelFormButton.addEventListener("click", () => closeDialog(elements.formModal));
elements.deleteRecipeButton.addEventListener("click", handleDelete);
elements.editRecipeButton.addEventListener("click", () => openForm(getSelectedRecipe()));
elements.form.addEventListener("submit", handleSubmit);
elements.refreshButton.addEventListener("click", () => loadRecipes().catch((error) => reportIssue(error.message)));
elements.searchInput.addEventListener("input", () => {
  renderRecipes();
  if (!getFilteredRecipes().some((recipe) => String(recipe.id) === String(state.selectedRecipeId))) {
    showCoverPage();
  }
});
elements.recipeList.addEventListener("click", (event) => {
  const item = event.target.closest(".toc-recipe");

  if (!item) {
    return;
  }

  const recipe = state.recipes.find((entry) => String(entry.id) === String(item.dataset.id));

  if (recipe) {
    flipToRecipe(recipe);
  }
});

loadRecipes().catch((error) => {
  reportIssue(error.message);
  elements.emptyState.hidden = false;
});
