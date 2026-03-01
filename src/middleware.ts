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
            const role = user.role;

            if (pathname.startsWith("/staff/manager") && role !== "manager") return sendToHome(role, request);
            if (pathname.startsWith("/staff/kitchen") && role !== "chef") return sendToHome(role, request);
            if (pathname.startsWith("/staff/waiter") && role !== "waiter") return sendToHome(role, request);
            if (pathname.startsWith("/staff/cashier") && role !== "cashier") return sendToHome(role, request);

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

function sendToHome(role: string, req: NextRequest) {
    const origin = req.nextUrl.origin;
    if (role === "manager") return NextResponse.redirect(new URL("/staff/manager", origin));
    if (role === "chef") return NextResponse.redirect(new URL("/staff/kitchen", origin));
    if (role === "waiter") return NextResponse.redirect(new URL("/staff/waiter", origin));
    if (role === "cashier") return NextResponse.redirect(new URL("/staff/cashier", origin)); 
    return NextResponse.redirect(new URL("/staff/login", origin)); 
}

export const config = {
  matcher: ["/super-admin/:path*", "/admin/:path*", "/staff/:path*"],
};