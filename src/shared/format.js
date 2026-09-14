export function formatSize(kilobytes) {
  if (kilobytes < 1024) return `${kilobytes} KB`
  const megabytes = kilobytes / 1024
  if (megabytes < 1024) return `${megabytes.toFixed(1)} MB`
  return `${(megabytes / 1024).toFixed(2)} GB`
}
