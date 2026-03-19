/** Chart data aggregation routes. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/", (_req, res) => {
  res.json({ message: "charts route" });
});

export default router;
