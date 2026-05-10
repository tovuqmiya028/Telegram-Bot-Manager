import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Smartphone, 
  Clock, 
  ListOrdered, 
  Radio, 
  LogOut,
  ShieldAlert
} from "lucide-react";
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar";
import { useAdminLogout, useGetAdminMe } from "@workspace/api-client-react";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { setOpenMobile } = useSidebar();
  const logout = useAdminLogout();
  const { data: adminMe } = useGetAdminMe();

  const handleLogout = async () => {
    await logout.mutateAsync();
    localStorage.removeItem("admin_token");
    setLocation("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/users", icon: Users },
    { name: "Sessions", href: "/sessions", icon: Smartphone },
    { name: "Tasks", href: "/tasks", icon: Clock },
    { name: "Logs", href: "/logs", icon: ListOrdered },
    { name: "Broadcast", href: "/broadcast", icon: Radio },
  ];

  return (
    <Sidebar className="border-r border-border bg-sidebar h-screen">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-sidebar-foreground">USERBOT ADMIN</h2>
            <p className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-widest">Command Center</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive}
                  tooltip={item.name}
                >
                  <Link 
                    href={item.href}
                    onClick={() => setOpenMobile(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <item.icon size={18} className={isActive ? "text-primary" : "text-sidebar-foreground/50"} />
                    {item.name}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="mb-4 px-2">
          <p className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-1">Operator</p>
          <p className="text-sm font-semibold text-sidebar-foreground">{adminMe?.username || "Admin"}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={18} />
          Terminate Session
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
