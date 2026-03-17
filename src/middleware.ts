import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. PUBLIC ASSET BYPASS (CRITICAL FIX: Prevents infinite redirect loops)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. SUPER ADMIN ZONE
  if (pathname.startsWith("/super-admin")) {
    const isSuperAdmin = request.cookies.get("gecko_super_admin");
    if (!isSuperAdmin) return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. RESTAURANT ADMIN ZONE
  if (pathname.startsWith("/admin")) {
    const staffToken = request.cookies.get("gecko_staff_token")?.value;
    if (staffToken) {
        try {
            const user = JSON.parse(staffToken);
            return sendToHome(user.role, request);
        } catch (e) {}
    }

    const tenantId = request.cookies.get("gecko_tenant_id");
    if (!tenantId) return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. STAFF ZONES
  if (pathname.startsWith("/staff")) {
    const tenantId = request.cookies.get("gecko_tenant_id");
    const staffToken = request.cookies.get("gecko_staff_token")?.value;
    const isLoginPage = pathname === "/staff/login";

    // DEVICE CHECK
    if (!tenantId && !isLoginPage) {
        return NextResponse.redirect(new URL("/staff/login", request.url));
    }

    // ALREADY LOGGED IN CHECK
    if (isLoginPage && staffToken && tenantId) {
        try {
            const user = JSON.parse(staffToken);
            return sendToHome(user.role, request);
        } catch (e) {
            const resp = NextResponse.next();
            resp.cookies.delete("gecko_staff_token");
            return resp;
        }
    }

    // PROTECTED ROUTES
    if (!isLoginPage) {
        if (!staffToken) {
            return NextResponse.redirect(new URL("/staff/login", request.url));
        }

        try {
            const user = JSON.parse(staffToken);
            const role = String(user.role || "").toLowerCase().trim(); // FIX: Enforce lowercase to prevent mismatches

            // Role-based route protection
            if (pathname.startsWith("/staff/manager") && role !== "manager") return sendToHome(role, request);
            if (pathname.startsWith("/staff/kitchen") && role !== "chef") return sendToHome(role, request);
            if (pathname.startsWith("/staff/waiter") && role !== "waiter") return sendToHome(role, request);
            if (pathname.startsWith("/staff/cashier") && role !== "cashier") return sendToHome(role, request);
            if (pathname.startsWith("/staff/bartender") && role !== "bartender") return sendToHome(role, request); // ADDED BARTENDER

            if (pathname === "/staff" || pathname === "/staff/") return sendToHome(role, request);

        } catch (e) {
            const resp = NextResponse.redirect(new URL("/staff/login", request.url));
            resp.cookies.delete("gecko_staff_token");
            return resp;
        }
    }
  }

  return NextResponse.next();
}

// --- CRITICAL FIX: Loop-Proof Routing ---
function sendToHome(role: string, req: NextRequest) {
    const origin = req.nextUrl.origin;
    const safeRole = String(role || "").toLowerCase().trim();
    let destination = "/staff/login";

    if (safeRole === "manager") destination = "/staff/manager";
    else if (safeRole === "chef") destination = "/staff/kitchen";
    else if (safeRole === "waiter") destination = "/staff/waiter";
    else if (safeRole === "cashier") destination = "/staff/cashier";
    else if (safeRole === "bartender") destination = "/staff/bartender"; // ADDED BARTENDER

    // 1. KILLS INFINITE LOOPS: If they are already exactly on the intended destination page (or a sub-page of it), let them through!
    if (req.nextUrl.pathname.startsWith(destination)) {
        return NextResponse.next();
    }

    const response = NextResponse.redirect(new URL(destination, origin));

    // 2. SELF-HEALING: If the role is invalid and we are sending them back to login, destroy the bad cookie.
    if (destination === "/staff/login") {
        response.cookies.delete("gecko_staff_token");
    }

    return response;
}

export const config = {
  matcher: ["/super-admin/:path*", "/admin/:path*", "/staff/:path*"],
};