import express from "express";
import chatRouter from "./routes/chat";
import choresRouter from "./routes/chores";
import hobbiesRouter from "./routes/hobbies";
import pantryRouter from "./routes/pantry";
import recipesRouter from "./routes/recipes";
import scheduleInstructionsRouter from "./routes/scheduleInstructions";
import schedulesRouter from "./routes/schedules";
import todosRouter from "./routes/todos";

if (!process.env.DB_PATH)
  throw new Error("DB_PATH environment variable is not set");

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());
app.use("/api/chat", chatRouter);
app.use("/api/chores", choresRouter);
app.use("/api/hobbies", hobbiesRouter);
app.use("/api/pantry", pantryRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/schedule-instructions", scheduleInstructionsRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/todos", todosRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
