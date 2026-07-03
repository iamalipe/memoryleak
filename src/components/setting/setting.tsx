import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsIcon, Palette, Cloud, Cpu } from "lucide-react"
import { useState } from "react"
import { SettingGeneral } from "./setting-general"
import { SettingDrive } from "./setting-drive"
import { SettingAiModels } from "./setting-ai-models"

interface SettingDialogProps {
  defaultTab?: string
}

const SettingDialog = ({ defaultTab = "general" }: SettingDialogProps) => {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Allow external control of which tab opens
  const handleOpen = (tab?: string) => {
    if (tab) setActiveTab(tab)
    setOpen(true)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleOpen()}
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full overflow-x-auto justify-start sm:justify-center flex-nowrap scrollbar-none h-auto py-1 px-1 gap-1 shrink-0">
            <TabsTrigger value="general" className="flex items-center gap-1.5 shrink-0">
              <Palette className="h-3.5 w-3.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="drive" className="flex items-center gap-1.5 shrink-0">
              <Cloud className="h-3.5 w-3.5" />
              Google Drive
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5 shrink-0">
              <Cpu className="h-3.5 w-3.5" />
              AI Models
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            <SettingGeneral />
          </TabsContent>

          <TabsContent value="drive" className="mt-4">
            <SettingDrive />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <SettingAiModels />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default SettingDialog
