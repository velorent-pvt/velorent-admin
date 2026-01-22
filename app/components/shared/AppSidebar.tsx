"use client";

import * as React from "react";
import {
  Car,
  Store,
  Layers,
  ClipboardCheck,
  Users,
  UserCheck,
  Settings2Icon,
  SettingsIcon,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar";

import { SidebarNav } from "./SidebarNav";
import { Form, Link } from "react-router";
import Logo from "./Logo";

const data = {
  navMain: [
    {
      title: "Vehicles",
      url: "#",
      icon: Car,
      items: [
        {
          title: "Brands",
          url: "/brands",
        },
        {
          title: "Models",
          url: "/models",
        },
        {
          title: "Cars",
          url: "/cars",
        },
        {
          title: "Requests",
          url: "/pending",
        },
      ],
    },
    {
      title: "Users",
      url: "#",
      icon: Users,
      items: [
        {
          title: "Customers",
          url: "/customers",
        },
        {
          title: "Hosts",
          url: "/hosts",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-0">
        <div className="flex justify-center">
          <Logo />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuItem>
          <Form method="post" action="/logout">
            <SidebarMenuButton type="submit">
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </Form>
        </SidebarMenuItem>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
