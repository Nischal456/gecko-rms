import BartenderSidebar from "./Sidebar";
import { getPublicStaffList } from "@/app/actions/staff-auth";

export default async function BartenderLayout({ children }: { children: React.ReactNode }) {
  // Fetch the restaurant (tenant) details securely on the server side
  // This guarantees 0 lag and instant loading!
  const tenantData = await getPublicStaffList();

  return (
    <div className="flex h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Pass the dynamic tenant name and logo to the Sidebar */}
      <BartenderSidebar 
        tenantName={tenantData.tenantName} 
        logo={tenantData.logo} 
      />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}