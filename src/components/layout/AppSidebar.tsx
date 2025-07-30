import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Settings,
  LogOut,
  PiggyBank
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useStore } from "@/store/useStore";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: Receipt },
  { title: "Subscriptions", url: "/subscriptions", icon: CreditCard },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { user, logout } = useStore();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary font-medium" : "hover:bg-accent/50";

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarContent className="bg-gradient-subtle">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-financial rounded-lg flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-white" />
            </div>
            {open && (
              <div>
                <h1 className="font-bold text-lg bg-gradient-financial bg-clip-text text-transparent">
                  Wise Wallet
                </h1>
              </div>
            )}
          </div>
        </div>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.profilePicture} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {open && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="w-4 h-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings and Logout */}
        <div className="mt-auto p-4 border-t border-border/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button className="w-full hover:bg-accent/50">
                  <Settings className="w-4 h-4" />
                  {open && <span>Settings</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button 
                  onClick={logout}
                  className="w-full hover:bg-destructive/10 text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  {open && <span>Logout</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}