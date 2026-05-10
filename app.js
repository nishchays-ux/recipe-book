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
  cancelFormButton: document.querySelector("#cancelFormButton"),
  closeDetailButton: document.querySelector("#closeDetailButton"),
  deleteRecipeButton: document.querySelector("#deleteRecipeButton"),
  detailModal: document.querySelector("#detailModal"),
  editRecipeButton: document.querySelector("#editRecipeButton"),
  emptyState: document.querySelector("#emptyState"),
  form: document.querySelector("#recipeForm"),
  formModal: document.querySelector("#formModal"),
  formTitle: document.querySelector("#formTitle"),
  ingredientInput: document.querySelector("#ingredientInput"),
  ingredientsList: document.querySelector("#ingredientsList"),
  notesInput: document.querySelector("#notesInput"),
  recipeDetail: document.querySelector("#recipeDetail"),
  recipeList: document.querySelector("#recipeList"),
  refreshButton: document.querySelector("#refreshButton"),
  searchInput: document.querySelector("#searchInput"),
  statusMessage: document.querySelector("#statusMessage"),
  stepInput: document.querySelector("#stepInput"),
  stepsList: document.querySelector("#stepsList"),
  tagsInput: document.querySelector("#tagsInput"),
  timeInput: document.querySelector("#timeInput"),
  titleInput: document.querySelector("#titleInput"),
};

function hasApiUrl() {
  return API_URL && !API_URL.includes("<subdomain>");
}

function setStatus(message) {
  elements.statusMessage.textContent = message;
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
  if (!tags.length) {
    return "";
  }

  return `<div class="tag-list">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderRecipes() {
  const recipes = getFilteredRecipes();
  elements.recipeList.innerHTML = recipes
    .map(
      (recipe) => `
        <button class="recipe-card" type="button" data-id="${escapeHtml(recipe.id)}">
          <div>
            <h2>${escapeHtml(recipe.title)}</h2>
            <div class="recipe-meta">${escapeHtml(recipe.time || "Time not set")}</div>
          </div>
          ${renderTags(recipe.tags)}
        </button>
      `,
    )
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

function openDetail(recipe) {
  state.selectedRecipeId = recipe.id;

  const ingredients = (recipe.ingredients || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const instructions = (recipe.instructions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  elements.recipeDetail.innerHTML = `
    <h2 class="detail-title">${escapeHtml(recipe.title)}</h2>
    ${renderTags(recipe.tags)}
    <p class="recipe-meta">${escapeHtml(recipe.time || "Time not set")}</p>

    <div class="recipe-spread">
      <section class="detail-section">
        <h3>Ingredients</h3>
        <ul>${ingredients}</ul>
      </section>

      <section class="detail-section">
        <h3>Steps</h3>
        <ol>${instructions}</ol>
      </section>
    </div>

    ${
      recipe.notes
        ? `<section class="detail-section"><h3>Notes</h3><p class="notes">${escapeHtml(recipe.notes)}</p></section>`
        : ""
    }
  `;

  openDialog(elements.detailModal);
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
  setStatus("Loading recipes...");

  const url = hasApiUrl() ? API_URL : FALLBACK_URL;
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Could not load recipes (${response.status})`);
  }

  state.recipes = await response.json();
  state.usingFallback = !hasApiUrl();

  renderRecipes();
  setStatus(state.usingFallback ? "Previewing local recipes.json" : "Synced with API");
}

async function saveRecipes(nextRecipes) {
  if (!hasApiUrl()) {
    state.recipes = nextRecipes;
    renderRecipes();
    setStatus("Saved in this browser preview. Add the Worker URL in app.js to persist.");
    return;
  }

  setStatus("Saving...");
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
  setStatus("Saved to GitHub");
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
    setStatus("Add at least one ingredient.");
    elements.ingredientInput.focus();
    return;
  }

  if (!state.formSteps.length) {
    setStatus("Add at least one step.");
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
}

async function handleDelete() {
  const recipe = getSelectedRecipe();

  if (!recipe || !confirm(`Delete "${recipe.title}"?`)) {
    return;
  }

  const nextRecipes = state.recipes.filter((item) => String(item.id) !== String(recipe.id));
  await saveRecipes(nextRecipes);
  closeDialog(elements.detailModal);
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
elements.closeDetailButton.addEventListener("click", () => closeDialog(elements.detailModal));
elements.deleteRecipeButton.addEventListener("click", handleDelete);
elements.editRecipeButton.addEventListener("click", () => {
  const recipe = getSelectedRecipe();
  closeDialog(elements.detailModal);
  openForm(recipe);
});
elements.form.addEventListener("submit", handleSubmit);
elements.refreshButton.addEventListener("click", () => loadRecipes().catch((error) => setStatus(error.message)));
elements.searchInput.addEventListener("input", renderRecipes);
elements.recipeList.addEventListener("click", (event) => {
  const card = event.target.closest(".recipe-card");

  if (!card) {
    return;
  }

  const recipe = state.recipes.find((item) => String(item.id) === String(card.dataset.id));

  if (recipe) {
    openDetail(recipe);
  }
});

loadRecipes().catch((error) => {
  setStatus(error.message);
  elements.emptyState.hidden = false;
});
