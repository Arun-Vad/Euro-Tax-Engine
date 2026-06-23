import React from "react";
import { Link, useLocation } from "wouter";
import { Calculator, LayoutDashboard, Settings2, Receipt, Map, ListTree, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calculator", label: "Tax Engine", icon: Calculator },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/compliance", label: "Compliance", icon: FileCheck },
];

const configItems = [
  { href: "/jurisdictions", label: "Jurisdictions", icon: Map },
  { href: "/categories", label: "Categories", icon: ListTree },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border/50">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
            <div className="flex items-center gap-2 font-bold text-sidebar-foreground">
              <Settings2 className="h-5 w-5" />
              <span>Global Tax Engine</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4 space-y-8">
            <div className="space-y-2">
              <div className="px-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Core
              </div>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.href}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
            <div className="space-y-2">
              <div className="px-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Configuration
              </div>
              <SidebarMenu>
                {configItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === item.href}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
