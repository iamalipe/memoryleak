import { createRoute } from "@tanstack/react-router";
import ErrorPage from "@/components/general/error-page";
import LoadingElement from "@/components/general/loading-element";
import PageNotFound from "@/components/general/page-not-found";
import { rootRoute } from "@/routes/root-route";
import AppPage from "./app";

export const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: AppPage,
  errorComponent: ErrorPage,
  notFoundComponent: PageNotFound,
  pendingComponent: LoadingElement,
});

export const appSplatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app/$",
  component: AppPage,
  errorComponent: ErrorPage,
  notFoundComponent: PageNotFound,
  pendingComponent: LoadingElement,
});
