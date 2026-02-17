import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ===========================================================
  // 1. SUPER ADMIN ZONE (Strict Protection)
  // ===========================================================
  if (pathname.startsWith("/super-admin")) {
    const isSuperAdmin = request.cookies.get("gecko_super_admin");
    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ===========================================================
  // 2. RESTAURANT ADMIN ZONE
  // ===========================================================
  if (pathname.startsWith("/admin")) {
    // 1. Check if a Staff Member is trying to access Admin
    const staffToken = request.cookies.get("gecko_staff_token")?.value;
    if (staffToken) {
        // If they are staff, they shouldn't be here. Send them to their dashboard.
        try {
            const user = JSON.parse(staffToken);
            return sendToHome(user.role, request);
        } catch (e) {
            // Token corrupt? Continue to normal checks.
        }
    }

    // 2. Standard Admin Check
    const tenantId = request.cookies.get("gecko_tenant_id");
    if (!tenantId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ===========================================================
  // 3. STAFF ZONES (High Security Role-Based Access)
  // ===========================================================
  if (pathname.startsWith("/staff")) {
    const tenantId = request.cookies.get("gecko_tenant_id");
    const staffToken = request.cookies.get("gecko_staff_token")?.value;
    const isLoginPage = pathname === "/staff/login";

    // A. DEVICE CHECK
    // If device is not linked to a restaurant, force setup (except on login)
    if (!tenantId && !isLoginPage) {
        return NextResponse.redirect(new URL("/staff/login", request.url));
    }

    // B. "ALREADY LOGGED IN" CHECK
    // If on Login Page BUT has valid token -> Auto-redirect to specific dashboard
    if (isLoginPage && staffToken) {
        try {
            const user = JSON.parse(staffToken);
            return sendToHome(user.role, request);
        } catch (e) {
            // Token corrupt? Delete it and stay on login
            const resp = NextResponse.next();
            resp.cookies.delete("gecko_staff_token");
            return resp;
        }
    }

    // C. PROTECTED ROUTES (Strict RBAC)
    if (!isLoginPage) {
        // 1. Authentication Check
        if (!staffToken) {
            return NextResponse.redirect(new URL("/staff/login", request.url));
        }

        // 2. Authorization (Role Shield)
        try {
            const user = JSON.parse(staffToken);
            const role = user.role; // 'manager' | 'chef' | 'waiter' | 'cashier'

            // --- STRICT BOUNDARIES ---
            
            // MANAGER: Only /staff/manager
            if (pathname.startsWith("/staff/manager") && role !== "manager") {
                return sendToHome(role, request);
            }

            // KITCHEN: Only /staff/kitchen
            if (pathname.startsWith("/staff/kitchen") && role !== "chef") {
                return sendToHome(role, request);
            }

            // WAITER: Only /staff/waiter
            if (pathname.startsWith("/staff/waiter") && role !== "waiter") {
                return sendToHome(role, request);
            }
            
            // CASHIER: Only /staff/cashier
            if (pathname.startsWith("/staff/cashier") && role !== "cashier") {
                return sendToHome(role, request);
            }

            // Prevent access to generic /staff root
            if (pathname === "/staff" || pathname === "/staff/") {
                return sendToHome(role, request);
            }

        } catch (e) {
            // Token is invalid/corrupt. Force re-login.
            const resp = NextResponse.redirect(new URL("/staff/login", request.url));
            resp.cookies.delete("gecko_staff_token");
            return resp;
        }
    }
  }

  return NextResponse.next();
}

// --- HELPER: Smart Redirector ---
// Sends the user exactly where they belong based on their role
function sendToHome(role: string, req: NextRequest) {
    const origin = req.nextUrl.origin;

    if (role === "manager") return NextResponse.redirect(new URL("/staff/manager", origin));
    if (role === "chef") return NextResponse.redirect(new URL("/staff/kitchen", origin));
    if (role === "waiter") return NextResponse.redirect(new URL("/staff/waiter", origin));
    if (role === "cashier") return NextResponse.redirect(new URL("/staff/cashier", origin)); // FIXED: Points to /cashier
    
    // Fallback if role is unknown
    return NextResponse.redirect(new URL("/staff/login", origin)); 
}

export const config = {
  matcher: [
    "/super-admin/:path*", 
    "/admin/:path*", 
    "/staff/:path*"
  ],
};