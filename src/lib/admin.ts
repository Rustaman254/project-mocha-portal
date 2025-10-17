export const ADMIN_ADDRESSES = [
  "0XC4110712CEF3E62B628E414EBCC4FC0343C2FE4C", 
  "0xc4110712cef3e62b628e414ebcc4fc0343c2fe4c", 
  "0x80569F788Ca7564429feB8Aabdd4Ff73e0aC98E0", 
  "0x80569f788ca7564429feb8aabdd4ff73e0ac98e0", 
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

