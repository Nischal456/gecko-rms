import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // -----------------------------------------------------------
  // 1. PROTECT SUPER ADMIN (Your Original Code)
  // -----------------------------------------------------------
  if (pathname.startsWith("/super-admin")) {
    const isSuperAdmin = request.cookies.get("gecko_super_admin");
    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // -----------------------------------------------------------
  // 2. PROTECT RESTAURANT ADMIN (Your Original Code)
  // -----------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    const tenantId = request.cookies.get("gecko_tenant_id");
    
    if (!tenantId) {
      // If cookie is missing, kick them back to login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // -----------------------------------------------------------
  // 3. PROTECT STAFF ZONES (Enhanced with Role Security)
  // -----------------------------------------------------------
  if (pathname.startsWith("/staff")) {
    const tenantId = request.cookies.get("gecko_tenant_id");
    const staffToken = request.cookies.get("gecko_staff_token")?.value;
    const isLoginPage = pathname === "/staff/login";

    // A. Device Linking Check
    // If device is not linked to a restaurant, force them to setup (except on login page)
    if (!tenantId && !isLoginPage) {
        return NextResponse.redirect(new URL("/staff/login", request.url));
    }

    // B. "Already Logged In" Check
    // If user is on Login Page BUT has a valid token -> Auto-redirect to their dashboard
    if (isLoginPage && staffToken) {
        try {
            const user = JSON.parse(staffToken);
            return sendToHome(user.role, request);
        } catch (e) {
            // Token corrupt? Let them stay on login to fix it
        }
    }

    // C. Protected Staff Routes (Not Login)
    if (!isLoginPage) {
        // 1. Auth Check: Must have staff token
        if (!staffToken) {
            return NextResponse.redirect(new URL("/staff/login", request.url));
        }

        // 2. Role-Based Access Control (RBAC) - The Security Shield
        try {
            const user = JSON.parse(staffToken);
            const role = user.role; // 'manager' | 'chef' | 'waiter' | 'cashier'

            // --- SHIELD: MANAGER AREA ---
            // Only Managers allowed
            if (pathname.startsWith("/staff/manager") && role !== "manager") {
                return sendToHome(role, request);
            }

            // --- SHIELD: KITCHEN AREA ---
            // Only Chefs and Managers allowed
            if (pathname.startsWith("/staff/kitchen") && role !== "chef" && role !== "manager") {
                return sendToHome(role, request);
            }

            // --- SHIELD: WAITER AREA ---
            // Only Waiters and Managers allowed
            if (pathname.startsWith("/staff/waiter") && role !== "waiter" && role !== "manager") {
                return sendToHome(role, request);
            }
            
            // --- SHIELD: POS AREA ---
            // Chefs should not be in POS
            if (pathname.startsWith("/staff/pos") && role === "chef") {
                return sendToHome(role, request);
            }

        } catch (e) {
            // If JSON parse fails, token is invalid. Kick to login.
            const resp = NextResponse.redirect(new URL("/staff/login", request.url));
            resp.cookies.delete("gecko_staff_token");
            return resp;
        }
    }
  }

  return NextResponse.next();
}

// --- HELPER: Redirect User to their Safe Zone ---
function sendToHome(role: string, req: NextRequest) {
    if (role === "manager") return NextResponse.redirect(new URL("/staff/manager", req.url));
    if (role === "chef") return NextResponse.redirect(new URL("/staff/kitchen", req.url));
    if (role === "waiter") return NextResponse.redirect(new URL("/staff/waiter", req.url));
    // Default fallback (Cashier/General)
    return NextResponse.redirect(new URL("/staff/pos", req.url)); 
}

export const config = {
  matcher: ["/super-admin/:path*", "/admin/:path*", "/staff/:path*"],
};