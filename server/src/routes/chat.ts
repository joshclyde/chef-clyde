import express from "express";

import { MOCK_USAGE, resolveAiOptions } from "../services/aiOptions";
import { generateChatResponse } from "../services/chat";
import type { ChatMode } from "../types/chat";

const router = express.Router();

router.post("/", async (req, res) => {
  const { messages, mode = "new-recipe" } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    mode?: ChatMode;
  };
  const opts = resolveAiOptions(req.body);

  if (process.env.MOCK_AI === "true") {
    res.json({ content: "Mocked response.", usage: MOCK_USAGE });
    return;
  }

  try {
    const { content, usage } = await generateChatResponse(messages, mode, opts);
    res.json({ content, usage });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
