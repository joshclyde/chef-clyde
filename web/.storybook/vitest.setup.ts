import { setProjectAnnotations } from "@storybook/react-vite";
import { beforeAll } from "vitest";

import * as projectAnnotations from "./preview";

// Applies the global decorators/parameters from preview.ts to the stories under
// test, so the Vitest test-runner renders them exactly like the Storybook UI.
const project = setProjectAnnotations([projectAnnotations]);

beforeAll(project.beforeAll);
