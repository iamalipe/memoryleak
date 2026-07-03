import { Footer } from "@/components/footer/footer"
import { MainPanel } from "@/components/main-panel/main-panel"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { SidebarMain, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

const HomePage = () => {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="h-full-x w-full-x flex flex-col overflow-hidden bg-background text-foreground">
          <div className="flex flex-1 overflow-hidden bg-background">
            <SidebarMain className="overflow-hidden">
              <AppSidebar />
              <MainPanel />
            </SidebarMain>
          </div>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </SidebarProvider>
    </ThemeProvider>
  )
}
export default HomePage
