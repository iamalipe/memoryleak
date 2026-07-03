import { Outlet } from "@tanstack/react-router"

import AlertPopupProvider from "@/alert-popup/alert-popup-provider"
import { Toaster } from "@/components/ui/sonner"
import { GlobalSearch } from "@/components/search/global-search"

const RootLayout = () => {
  return (
    <>
      <Outlet />
      <Toaster position="top-center" richColors visibleToasts={10} />
      <AlertPopupProvider />
      <GlobalSearch />
    </>
  )
}
export default RootLayout
