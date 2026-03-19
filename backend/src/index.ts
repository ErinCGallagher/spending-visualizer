/** Express app entry point. */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import uploadRoutes from "./routes/uploads";
import transactionRoutes from "./routes/transactions";
import chartRoutes from "./routes/charts";
import accountRoutes from "./routes/account";

const app = express();
const port = process.env.PORT ?? 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

// BetterAuth handles all /api/auth/* routes
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/uploads", uploadRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/charts", chartRoutes);
app.use("/api/account", accountRoutes);

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
