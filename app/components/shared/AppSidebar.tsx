"use client";

import * as React from "react";
import { BellRing, Car, LogOut, ShieldCheck, Users, PieChart } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

import { SidebarNav } from "./SidebarNav";
import { Form } from "react-router";
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
    {
      title: "Verifications",
      url: "#",
      icon: ShieldCheck,
      items: [
        {
          title: "Pending Reviews",
          url: "/pending/verifications",
        },
      ],
    },
    {
      title: "Notifications",
      url: "#",
      icon: BellRing,
      items: [
        {
          title: "Compose",
          url: "/notifications",
        },
        {
          title: "Task Notifications",
          url: "/notifications/tasks",
        },
      ],
    },
    {
      title: "Reports",
      url: "#",
      icon: PieChart,
      items: [
        {
          title: "Cars Overview",
          url: "/reports/cars-overview",
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
