/** Account management routes (delete account). */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.delete("/", (_req, res) => {
  res.json({ message: "account route" });
});

export default router;
