/** Express middleware that rejects unauthenticated requests. */

import { Request, Response, NextFunction } from "express";
import { auth } from "../auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await auth.api.getSession({ headers: req.headers as Record<string, string> });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.locals.userId = session.user.id;
  next();
}
