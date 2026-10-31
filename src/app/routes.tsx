import type { ComponentType } from "react"
import {
  createBrowserRouter,
  type LazyRouteFunction,
  type RouteObject,
} from "react-router"
import { NotFoundPage, Root, RouteError } from "./Root"
import HomePage from "@/pages/public/HomePage"
import { AppLayout } from "@/components/layout/AppLayout"
import { PortalLayout } from "@/components/layout/PortalLayout"
import { LoadingState } from "@/components/ui/feedback"

/** Route-level code splitting: each screen loads on first visit. */
const page =
  (
    load: () => Promise<{ default: ComponentType }>,
  ): LazyRouteFunction<RouteObject> =>
  async () => ({ Component: (await load()).default })
const portal =
  (
    name: "PortalHome" | "PortalInstallations" | "PortalDocuments" | "PortalAssets" | "PortalService",
  ): LazyRouteFunction<RouteObject> =>
  async () => ({
    Component: (await import("@/pages/portal/PortalPages"))[name],
  })

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Root,
      errorElement: <RouteError />,
      HydrateFallback: () => <LoadingState />,
      children: [
        { index: true, Component: HomePage },
        {
          path: "enquiry",
          lazy: page(() => import("@/pages/public/EnquiryPage")),
        },
        {
          path: "assistant",
          lazy: page(() => import("@/pages/public/AssistantPage")),
        },
        { path: "login", lazy: page(() => import("@/pages/public/LoginPage")) },
        {
          path: "passport",
          lazy: page(() => import("@/pages/public/PassportPublicPage")),
        },
        {
          path: "passport/:reference",
          lazy: page(() => import("@/pages/public/PassportPublicPage")),
        },
        {
          path: "app",
          Component: AppLayout,
          errorElement: <RouteError />,
          children: [
            {
              index: true,
              lazy: async () => ({
                Component: (await import("./AppIndex")).default,
              }),
            },
            {
              path: "dashboard",
              lazy: page(() => import("@/pages/app/crm/DashboardPage")),
            },
            {
              path: "leads",
              lazy: page(() => import("@/pages/app/crm/LeadsPage")),
            },
            {
              path: "leads/:id",
              lazy: page(() => import("@/pages/app/crm/LeadDetailPage")),
            },
            {
              path: "conversations",
              lazy: page(() => import("@/pages/app/crm/ConversationsPage")),
            },
            {
              path: "surveys",
              lazy: page(() => import("@/pages/app/crm/SurveysPage")),
            },
            {
              path: "surveys/:id",
              lazy: page(() => import("@/pages/app/crm/SurveyDetailPage")),
            },
            {
              path: "quotations",
              lazy: page(() => import("@/pages/app/crm/QuotationsPage")),
            },
            {
              path: "quotations/:id",
              lazy: page(() => import("@/pages/app/crm/QuotationDetailPage")),
            },
            {
              path: "orders",
              lazy: page(() => import("@/pages/app/ops/OrdersPage")),
            },
            {
              path: "orders/:id",
              lazy: page(() => import("@/pages/app/ops/OrderDetailPage")),
            },
            {
              path: "purchases",
              lazy: page(() => import("@/pages/app/ops/PurchasesPage")),
            },
            {
              path: "inventory",
              lazy: page(() => import("@/pages/app/ops/InventoryPage")),
            },
            {
              path: "dispatches",
              lazy: page(() => import("@/pages/app/ops/DispatchesPage")),
            },
            {
              path: "dispatches/:id",
              lazy: page(() => import("@/pages/app/ops/DispatchDetailPage")),
            },
            {
              path: "installations",
              lazy: page(() => import("@/pages/app/ops/InstallationsPage")),
            },
            {
              path: "installations/:id",
              lazy: page(
                () => import("@/pages/app/ops/InstallationDetailPage"),
              ),
            },
            {
              path: "technician",
              lazy: page(() => import("@/pages/app/ops/TechnicianPage")),
            },
            {
              path: "warranties",
              lazy: page(() => import("@/pages/app/after/WarrantiesPage")),
            },
            {
              path: "service-tickets",
              lazy: page(() => import("@/pages/app/after/ServiceTicketsPage")),
            },
            {
              path: "service-tickets/:id",
              lazy: page(() => import("@/pages/app/after/TicketDetailPage")),
            },
            {
              path: "passport/:reference",
              lazy: page(() => import("@/pages/app/after/PassportPage")),
            },
            {
              path: "reports",
              lazy: page(() => import("@/pages/app/admin/ReportsPage")),
            },
            {
              path: "users",
              lazy: page(() => import("@/pages/app/admin/UsersPage")),
            },
            {
              path: "settings",
              lazy: page(() => import("@/pages/app/admin/SettingsPage")),
            },
            { path: "*", Component: NotFoundPage },
          ],
        },
        {
          path: "portal",
          Component: PortalLayout,
          errorElement: <RouteError />,
          children: [
            { index: true, lazy: portal("PortalHome") },
            { path: "installations", lazy: portal("PortalInstallations") },
            { path: "documents", lazy: portal("PortalDocuments") },
            { path: "assets", lazy: portal("PortalAssets") },
            { path: "service", lazy: portal("PortalService") },
          ],
        },
        { path: "*", Component: NotFoundPage },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
)
