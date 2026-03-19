/** Upload routes: parse CSV, AI categorisation, confirm. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

// Placeholder — implemented in Phase 4
router.get("/", (_req, res) => {
  res.json({ message: "uploads route" });
});

export default router;
