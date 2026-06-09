import { Button, Inline, Text } from "../../ui";

type Props = {
  saving: boolean;
  savedRecipeId: string | null;
  saveError: string | null;
  onSave: () => void;
};

export function SaveRecipeRow({
  saving,
  savedRecipeId,
  saveError,
  onSave,
}: Props) {
  return (
    <Inline gap="md">
      <Button variant="success" size="sm" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : savedRecipeId ? "Saved!" : "Save to Recipes"}
      </Button>
      {saveError && (
        <Text variant="danger" size="sm">
          {saveError}
        </Text>
      )}
    </Inline>
  );
}
