import { createRootRoute } from "@tanstack/react-router"

import ErrorPage from "@/components/general/error-page"
import LoadingElement from "@/components/general/loading-element"
import PageNotFound from "@/components/general/page-not-found"
import RootLayout from "@/routes/root-layout"

import homePageRoute from "./home-page/home-page-route"
import privacyRoute from "./privacy/privacy-route"
import termsRoute from "./terms/terms-route"

export const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: ErrorPage,
  notFoundComponent: PageNotFound,
  pendingComponent: LoadingElement,
})

export const routeTree = rootRoute.addChildren([
  homePageRoute,
  privacyRoute,
  termsRoute,
])
