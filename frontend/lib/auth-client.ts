/** BetterAuth client — uses relative paths so the Next.js proxy handles routing. */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
