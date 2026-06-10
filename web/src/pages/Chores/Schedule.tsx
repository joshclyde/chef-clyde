import { Heading, Stack, Text } from "../../ui";

export default function Schedule() {
  return (
    <Stack gap="lg">
      <Heading level={1}>Schedule</Heading>
      <Text variant="muted">
        Your chores and when they're due next live on the Tasks page.
      </Text>
    </Stack>
  );
}
