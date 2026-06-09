export type Ingredient = {
  amount: string;
  unit: string;
  name: string;
  notes?: string;
};

export type Note = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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
  notes?: Note[];
};
