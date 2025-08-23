// hooks/useUserEvents.js
import { useWatchContractEvent } from 'wagmi'
import { useMemo, useState, useCallback } from 'react'

export function useUserEvents(contractAddress, abi, userAddress) {
  const [events, setEvents] = useState({
    transfers: [],
    bondPurchases: [],
    bondRedemptions: []
  })

  // Memoize the event handlers to prevent unnecessary re-renders
  const eventHandlers = useMemo(() => ({
    Transfer: (logs) => {
      const userTransfers = logs.filter(log => 
        log.args.from === userAddress || log.args.to === userAddress
      )
      if (userTransfers.length) {
        console.log('User transfer events:', userTransfers)
        setEvents(prev => ({
          ...prev,
          transfers: [...prev.transfers, ...userTransfers]
        }))
      }
    },
    BondPurchased: (logs) => {
      const userPurchases = logs.filter(log => log.args.investor === userAddress)
      if (userPurchases.length) {
        console.log('User bond purchases:', userPurchases)
        setEvents(prev => ({
          ...prev,
          bondPurchases: [...prev.bondPurchases, ...userPurchases]
        }))
      }
    },
    BondRedeemed: (logs) => {
      const userRedemptions = logs.filter(log => log.args.investor === userAddress)
      if (userRedemptions.length) {
        console.log('User bond redemptions:', userRedemptions)
        setEvents(prev => ({
          ...prev,
          bondRedemptions: [...prev.bondRedemptions, ...userRedemptions]
        }))
      }
    }
  }), [userAddress])

  // Clear events function
  const clearEvents = useCallback(() => {
    setEvents({
      transfers: [],
      bondPurchases: [],
      bondRedemptions: []
    })
  }, [])

  // Set up individual event watchers
  useWatchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'Transfer',
    onLogs: eventHandlers.Transfer,
    enabled: !!contractAddress && !!userAddress
  })

  useWatchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'BondPurchased',
    onLogs: eventHandlers.BondPurchased,
    enabled: !!contractAddress && !!userAddress
  })

  useWatchContractEvent({
    address: contractAddress,
    abi,
    eventName: 'BondRedeemed',
    onLogs: eventHandlers.BondRedeemed,
    enabled: !!contractAddress && !!userAddress
  })

  return {
    events,
    clearEvents
  }
}