import express from "express";

import { generateChatResponse } from "../services/chat";
import type { ChatMode } from "../types/chat";

const router = express.Router();

router.post("/", async (req, res) => {
  const { messages, mode = "new-recipe" } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    mode?: ChatMode;
  };

  if (process.env.MOCK_AI === "true") {
    res.json({ content: "Mocked response." });
    return;
  }

  try {
    const content = await generateChatResponse(messages, mode);
    res.json({ content });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
