declare global {
  const OPENCODE_VERSION: string
  const OPENCODE_CHANNEL: string
  const OCARINA_VERSION: string
}

export const InstallationVersion = typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "local"
export const InstallationChannel = typeof OPENCODE_CHANNEL === "string" ? OPENCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
export const OcarinaVersion = typeof OCARINA_VERSION === "string" ? OCARINA_VERSION : "0.1.0"
