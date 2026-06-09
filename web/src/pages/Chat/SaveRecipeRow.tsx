type Props = {
  saving: boolean;
  savedRecipeId: string | null;
  saveError: string | null;
  onSave: () => void;
};

export function SaveRecipeRow({ saving, savedRecipeId, saveError, onSave }: Props) {
  return (
    <div className="chat-save-row">
      <button onClick={onSave} disabled={saving} className="save-recipe-btn">
        {saving ? "Saving..." : savedRecipeId ? "Saved!" : "Save to Recipes"}
      </button>
      {saveError && <span className="save-error">{saveError}</span>}
    </div>
  );
}
