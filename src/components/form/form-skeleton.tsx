import { Skeleton } from "@/components/ui/skeleton"
import { cn, getRandomInt } from "@/lib/utils"
import { useMemo } from "react"

const _randomWidth = [
  `w-[20%]`,
  `w-[25%]`,
  `w-[30%]`,
  `w-[35%]`,
  `w-[40%]`,
  `w-[45%]`,
  `w-[50%]`,
  `w-[55%]`,
  `w-[60%]`,
]
const FormSkeleton = () => {
  const randomWidth = useMemo(
    () => _randomWidth[getRandomInt(0, _randomWidth.length - 1)],
    []
  )
  return (
    <div
      className="flex flex-col gap-1"
      role="status"
      aria-label="Loading form field"
    >
      <Skeleton className={cn(["h-4", randomWidth])} aria-hidden="true" />
      <Skeleton className="h-10 w-full" aria-hidden="true" />
    </div>
  )
}

export default FormSkeleton
