import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import recipesRouter from "./routes/recipes";

if (!process.env.DB_PATH)
  throw new Error("DB_PATH environment variable is not set");
const DB_DIR = process.env.DB_PATH;

const app = express();
const PORT = process.env.PORT ?? 3001;
const anthropic = new Anthropic();

app.use(express.json());
app.use("/api/recipes", recipesRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/pantry", (req, res) => {
  const { pantry } = req.body as { pantry: string };
  if (typeof pantry !== "string") {
    res.status(400).json({ error: "pantry must be a string" });
    return;
  }
  const filePath = path.join(DB_DIR, "pantry.json");
  fs.writeFileSync(filePath, JSON.stringify({ pantry }, null, 2));
  res.json({ success: true });
});

app.get("/api/pantry", (_req, res) => {
  const filePath = path.join(DB_DIR, "pantry.json");
  if (!fs.existsSync(filePath)) {
    res.json({ pantry: "" });
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    pantry: string;
  };
  res.json(data);
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (process.env.MOCK_AI === "true") {
    res.json({ content: "Mocked response." });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8096,
      thinking: { type: "adaptive" },
      system:
        "You are a creative and knowledgeable chef assistant for Chef Clyde. " +
        "Help users discover and create delicious recipes. When asked for a recipe, " +
        "provide clear ingredients with measurements and step-by-step cooking instructions. " +
        "You can also help with ingredient substitutions, scaling, and cooking tips.",
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    res.json({ content: textBlock?.text ?? "" });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
