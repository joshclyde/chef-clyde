import { useEffect, useState } from "react";

type Ingredient = {
  amount: string;
  unit: string;
  name: string;
  notes?: string;
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  ingredients: Ingredient[];
  steps: string[];
  tags?: string[];
  savedAt: string;
};

export default function SavedRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data: { recipes: Recipe[] }) => setRecipes(data.recipes))
      .catch(() => setError("Failed to load saved recipes."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="saved-recipes">
        <h1>Saved Recipes</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="saved-recipes">
      <h1>Saved Recipes</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {recipes.length === 0 ? (
        <p className="no-recipes-hint">
          No saved recipes yet. Chat with Chef Clyde and click "Save Recipe" to
          save one!
        </p>
      ) : (
        <ul className="recipe-list">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="recipe-card">
              <h2>{recipe.name}</h2>
              <p className="recipe-meta">
                Serves {recipe.servings} · Prep {recipe.prepTime}m · Cook{" "}
                {recipe.cookTime}m
              </p>
              <p className="recipe-description">{recipe.description}</p>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="recipe-tags">
                  {recipe.tags.map((tag) => (
                    <span key={tag} className="recipe-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <details>
                <summary>Ingredients ({recipe.ingredients.length})</summary>
                <ul>
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i}>
                      {ing.amount} {ing.unit} {ing.name}
                      {ing.notes ? ` (${ing.notes})` : ""}
                    </li>
                  ))}
                </ul>
              </details>
              <details>
                <summary>Steps ({recipe.steps.length})</summary>
                <ol>
                  {recipe.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </details>
              <p className="recipe-saved-at">
                Saved {new Date(recipe.savedAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
