import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * This is a super easy middleware for you to use, and it only has one job:
 * It checks if the user is authenticated, and if not, redirects to the login page.
 *
 * If you need more functionality, follow the docs here: https://nextjs.org/docs/app/api-reference/file-conventions/middleware
 */
export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Very simple auth check with redirect if not authenticated.
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
export const config = {
  runtime: "nodejs",
  matcher: ["/dashboard"], // Apply middleware to specific routes
};
