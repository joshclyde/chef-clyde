export type Ingredient = {
  amount: string;
  unit: string;
  name: string;
  notes?: string;
};

export type Recipe = {
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
