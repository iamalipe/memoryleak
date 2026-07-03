import { createRoute } from "@tanstack/react-router"

import ErrorPage from "@/components/general/error-page"
import LoadingElement from "@/components/general/loading-element"
import PageNotFound from "@/components/general/page-not-found"
import { rootRoute } from "@/routes/root-route"
import PublicHome from "./svg-maker"

const svgMakerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/svg",
  component: PublicHome,
  errorComponent: ErrorPage,
  notFoundComponent: PageNotFound,
  pendingComponent: LoadingElement,
})

export default svgMakerRoute
