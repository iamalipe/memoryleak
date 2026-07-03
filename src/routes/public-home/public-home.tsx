import AlertTestingComponent from "@/alert-popup/AlertTestingComponent"
import AIModelSelect from "@/components/llm-model/model-select"
import { isWebGPUSupport } from "@/lib/general"

const PublicHome = () => {
  console.log("isWebGPUSupport", isWebGPUSupport())

  return (
    <div className="flex h-svh w-svw flex-col items-center justify-center p-4">
      <div className="flex flex-col gap-2 px-4">
        <AIModelSelect />
      </div>
      <AlertTestingComponent />
    </div>
  )
}
export default PublicHome
