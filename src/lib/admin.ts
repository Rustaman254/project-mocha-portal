// Admin utilities and configuration
export const ADMIN_ADDRESSES = [
  "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4", // Deployer address
  "0x842d803eb7d05d6aa2ddb8c3eb912e6d97ce31c4", // Deployer address lowercase
  "0x80569F788Ca7564429feB8Aabdd4Ff73e0aC98E0", // Secondary admin (Anwar)
  "0x80569f788ca7564429feb8aabdd4ff73e0ac98e0", // Secondary admin lowercase
  // Add more admin addresses here as needed
]

export function isAdminAddress(address: string | undefined): boolean {
  if (!address) return false
  return ADMIN_ADDRESSES.includes(address.toLowerCase())
}

export function getAdminStatus(address: string | undefined, isConnected: boolean) {
  return {
    isConnected,
    isAdmin: isConnected && isAdminAddress(address),
    address,
  }
}

