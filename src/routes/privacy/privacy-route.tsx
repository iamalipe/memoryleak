import { createRoute } from "@tanstack/react-router"
import ErrorPage from "@/components/general/error-page"
import LoadingElement from "@/components/general/loading-element"
import PageNotFound from "@/components/general/page-not-found"
import { rootRoute } from "@/routes/root-route"
import PrivacyPage from "./privacy"

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPage,
  errorComponent: ErrorPage,
  notFoundComponent: PageNotFound,
  pendingComponent: LoadingElement,
})

export default privacyRoute
