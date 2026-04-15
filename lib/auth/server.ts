import "server-only";
import { createAuthServer, neonAuth } from "@neondatabase/auth/next/server";

export const authServer = createAuthServer();
export { neonAuth };
