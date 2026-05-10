const API_URL = "https://recipe-api.nishchay-s.workers.dev";
const FALLBACK_URL = "recipes.json";

const state = {
  recipes: [],
  selectedRecipeId: null,
  editingRecipeId: null,
  usingFallback: false,
};

const elements = {
  addRecipeButton: document.querySelector("#addRecipeButton"),
  cancelFormButton: document.querySelector("#cancelFormButton"),
  closeDetailButton: document.querySelector("#closeDetailButton"),
  deleteRecipeButton: document.querySelector("#deleteRecipeButton"),
  detailModal: document.querySelector("#detailModal"),
  editRecipeButton: document.querySelector("#editRecipeButton"),
  emptyState: document.querySelector("#emptyState"),
  form: document.querySelector("#recipeForm"),
  formModal: document.querySelector("#formModal"),
  formTitle: document.querySelector("#formTitle"),
  recipeDetail: document.querySelector("#recipeDetail"),
  recipeList: document.querySelector("#recipeList"),
  refreshButton: document.querySelector("#refreshButton"),
  searchInput: document.querySelector("#searchInput"),
  statusMessage: document.querySelector("#statusMessage"),
  titleInput: document.querySelector("#titleInput"),
  tagsInput: document.querySelector("#tagsInput"),
  timeInput: document.querySelector("#timeInput"),
  ingredientsInput: document.querySelector("#ingredientsInput"),
  instructionsInput: document.querySelector("#instructionsInput"),
  notesInput: document.querySelector("#notesInput"),
};

function hasApiUrl() {
  return API_URL && !API_URL.includes("<subdomain>");
}

function setStatus(message) {
  elements.statusMessage.textContent = message;
}

function normalizeLines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
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

    <section class="detail-section">
      <h3>Ingredients</h3>
      <ul>${ingredients}</ul>
    </section>

    <section class="detail-section">
      <h3>Instructions</h3>
      <ol>${instructions}</ol>
    </section>

    ${
      recipe.notes
        ? `<section class="detail-section"><h3>Notes</h3><p class="notes">${escapeHtml(recipe.notes)}</p></section>`
        : ""
    }
  `;

  openDialog(elements.detailModal);
}

function resetForm() {
  elements.form.reset();
  state.editingRecipeId = null;
  elements.formTitle.textContent = "New Recipe";
}

function openForm(recipe = null) {
  resetForm();

  if (recipe) {
    state.editingRecipeId = recipe.id;
    elements.formTitle.textContent = "Edit Recipe";
    elements.titleInput.value = recipe.title || "";
    elements.tagsInput.value = (recipe.tags || []).join(", ");
    elements.timeInput.value = recipe.time || "";
    elements.ingredientsInput.value = (recipe.ingredients || []).join("\n");
    elements.instructionsInput.value = (recipe.instructions || []).join("\n");
    elements.notesInput.value = recipe.notes || "";
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
    ingredients: normalizeLines(elements.ingredientsInput.value),
    instructions: normalizeLines(elements.instructionsInput.value),
    notes: elements.notesInput.value.trim(),
  };
}

async function handleSubmit(event) {
  event.preventDefault();

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
