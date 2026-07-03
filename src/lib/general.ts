export const isWebGPUSupport = () => {
  try {
    if (typeof navigator !== "undefined" && navigator.gpu) return true
    return false
  } catch {
    return false
  }
}
