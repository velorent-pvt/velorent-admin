import {
  Calendar,
  ChevronRight,
  HomeIcon,
  MessageSquareWarning,
  TicketPercent,
  Wallet2,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar";

export function SidebarNav({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const location = useLocation();

  const isActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + "/");

  const isGroupActive = (groupItems?: { url: string }[]) =>
    groupItems?.some(
      (item) =>
        location.pathname === item.url ||
        location.pathname.startsWith(item.url + "/")
    );

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Dashboard"
            className={`rounded-xl gap-3 px-4 text-[15px] font-medium ${
              isActive("/") && "bg-primary text-primary-foreground"
            }`}
          >
            <Link to="/">
              <HomeIcon />
              <span>Dashboard</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Bookings"
            className={`rounded-xl gap-3 px-4 text-[15px] font-medium ${
              isActive("/bookings") && "bg-primary text-primary-foreground"
            }`}
          >
            <Link to="/bookings">
              <Calendar />
              <span>Bookings</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Payments"
            className={`rounded-xl gap-3 px-4 text-[15px] font-medium ${
              isActive("/payments") && "bg-primary text-primary-foreground"
            }`}
          >
            <Link to="/payments">
              <Wallet2 />
              <span>Payments</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {items.map((item) => {
          const open = isGroupActive(item.items);

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={open}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={`rounded-xl gap-3 px-4 text-[15px] font-medium ${
                      open && "bg-muted"
                    }`}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          className={`rounded-xl px-4 text-sm ${
                            isActive(subItem.url) &&
                            "bg-primary text-primary-foreground"
                          }`}
                        >
                          <Link to={subItem.url}>{subItem.title}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}

        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Disputes"
            className={`rounded-xl gap-3 px-4 text-[15px] font-medium ${
              isActive("/disputes") && "bg-primary text-primary-foreground"
            }`}
          >
            <Link to="/disputes">
              <MessageSquareWarning />
              <span>Disputes</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Coupons"
            className={`rounded-xl gap-3 px-4 text-[15px] font-medium ${
              isActive("/coupons") && "bg-primary text-primary-foreground"
            }`}
          >
            <Link to="/coupons">
              <TicketPercent />
              <span>Coupons</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
