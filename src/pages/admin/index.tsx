"use client"
import React, { useState } from "react";
import Header from "@/components/@shared-components/header";
import StatCard from "@/components/@shared-components/statCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal } from "lucide-react";

// Dummy stat cards and monitoring
const adminStatCards = [
  {
    title: "Total Farms",
    value: "18",
    isLoading: false,
    icon: "TrendingUp",
    iconColor: "green",
    trend: { value: "+2", isPositive: true },
    footerLine1: "Added this month",
    footerLine2: "Active tranches",
  },
  {
    title: "Total Value Locked (TVL)",
    value: "$2,300,000",
    isLoading: false,
    icon: "DollarSign",
    iconColor: "yellow",
    trend: { value: "+5.2%", isPositive: true },
    footerLine1: "Growth YTD",
    footerLine2: "Includes all tranches",
  },
  {
    title: "Active Bonds",
    value: "421",
    isLoading: false,
    icon: "TrendingUp",
    iconColor: "green",
    trend: { value: "+13", isPositive: true },
    footerLine1: "New this month",
    footerLine2: "All outstanding",
  }
];

const dummyFarms = [
  { id: 1, name: "GreenAcres", owner: "0xOwner1", apy: "700", maturity: "24", bondValue: "100,000", active: true, min: 1000, max: 10000, collateral: 200, treeCount: 500, updated: "2025-06-11" },
  { id: 2, name: "RainTree", owner: "0xOwner2", apy: "600", maturity: "18", bondValue: "250,000", active: false, min: 2000, max: 15000, collateral: 180, treeCount: 900, updated: "2025-05-10" }
];
const dummyBonds = [
  { id: 101, farmId: 1, investor: "0xInvestor123", amount: 1000, share: 100, maturity: "2026-06-11", redeemed: false },
  { id: 102, farmId: 2, investor: "0xInvestor456", amount: 3000, share: 330, maturity: "2026-10-12", redeemed: false }
];
const dummyYields = [
  { id: 1, farmId: 1, yieldAmount: 1200, distributed: 600, pending: 600, last: "2025-03-10" }
];
const dummyCollateral = [
  { farmId: 1, totalTrees: 500, valuation: 200, value: 100_000, ratio: 130, threshold: 110, last: "2025-06-11" }
];
const dummyEvents = [
  { id: 1, type: "FarmAdded", desc: "Added GreenAcres", date: "2025-05-01" }
];

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [farmSearch, setFarmSearch] = useState("");
  const [bondSearch, setBondSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  // expanded dummy states for forms if desired

  return (
    <div className="min-h-screen bg-[#E6E6E6] dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Header />
      <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1800px]">
        <div className="mb-6">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">ADMIN PANEL</div>
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">MochaTree Admin Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-8">
          {adminStatCards.map((card, idx) => (
            <StatCard key={idx} {...card} />
          ))}
        </div>
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="rounded-full bg-white dark:bg-gray-800 p-1 flex flex-wrap">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="farms">Farms</TabsTrigger>
            <TabsTrigger value="bonds">Bonds</TabsTrigger>
            <TabsTrigger value="yield">Yield</TabsTrigger>
            <TabsTrigger value="collateral">Collateral</TabsTrigger>
            <TabsTrigger value="config">Vault Config</TabsTrigger>
            <TabsTrigger value="audits">Event Log</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <div className="p-4">
              <div className="text-xl font-bold mb-4">Overview</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                  <div className="font-semibold">Farms</div>
                  <div>{adminStatCards[0].value} (<span className="italic">{adminStatCards[0].footerLine1}</span>)</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                  <div className="font-semibold">TVL</div>
                  <div>{adminStatCards[1].value} (<span className="italic">{adminStatCards[1].footerLine1}</span>)</div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="farms">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-bold">Farm Management</div>
                <Input placeholder="Search farms..." value={farmSearch} onChange={e => setFarmSearch(e.target.value)} className="max-w-sm" />
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>APY (bps)</TableCell>
                    <TableCell>Maturity (mo)</TableCell>
                    <TableCell>Bond Value</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Limits</TableCell>
                    <TableCell>Collateral</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dummyFarms.filter(farm =>
                    farm.name.toLowerCase().includes(farmSearch.toLowerCase())
                  ).map(farm => (
                    <TableRow key={farm.id}>
                      <TableCell>{farm.id}</TableCell>
                      <TableCell>{farm.name}</TableCell>
                      <TableCell>{farm.owner}</TableCell>
                      <TableCell>{farm.apy}</TableCell>
                      <TableCell>{farm.maturity}</TableCell>
                      <TableCell>{farm.bondValue}</TableCell>
                      <TableCell>{farm.active ? "Active" : "Inactive"}</TableCell>
                      <TableCell>{farm.min} / {farm.max}</TableCell>
                      <TableCell>{farm.collateral} ({farm.treeCount} trees)</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Add/Edit farms and limits here */}
            </div>
          </TabsContent>
          <TabsContent value="bonds">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-bold">Bond Administration</div>
                <Input placeholder="Search bonds..." value={bondSearch} onChange={e => setBondSearch(e.target.value)} className="max-w-sm" />
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Farm</TableCell>
                    <TableCell>Investor</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Share Token</TableCell>
                    <TableCell>Maturity</TableCell>
                    <TableCell>Redeemed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dummyBonds.filter(bond =>
                    String(bond.id).includes(bondSearch) || bond.investor.toLowerCase().includes(bondSearch.toLowerCase())
                  ).map(bond => (
                    <TableRow key={bond.id}>
                      <TableCell>{bond.id}</TableCell>
                      <TableCell>{bond.farmId}</TableCell>
                      <TableCell>{bond.investor}</TableCell>
                      <TableCell>{bond.amount}</TableCell>
                      <TableCell>{bond.share}</TableCell>
                      <TableCell>{bond.maturity}</TableCell>
                      <TableCell>{bond.redeemed ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Settle/Rollover buttons could go here */}
            </div>
          </TabsContent>
          <TabsContent value="yield">
            <div className="p-4">
              <div className="text-xl font-bold mb-4">Yield Distribution</div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Farm ID</TableCell>
                    <TableCell>Total Yield</TableCell>
                    <TableCell>Distributed</TableCell>
                    <TableCell>Pending</TableCell>
                    <TableCell>Last Distribution</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dummyYields.map(yieldRow => (
                    <TableRow key={yieldRow.id}>
                      <TableCell>{yieldRow.farmId}</TableCell>
                      <TableCell>{yieldRow.yieldAmount}</TableCell>
                      <TableCell>{yieldRow.distributed}</TableCell>
                      <TableCell>{yieldRow.pending}</TableCell>
                      <TableCell>{yieldRow.last}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Distribute/refresh buttons could go here */}
            </div>
          </TabsContent>
          <TabsContent value="collateral">
            <div className="p-4">
              <div className="text-xl font-bold mb-4">Collateral Management</div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Farm ID</TableCell>
                    <TableCell>Total Trees</TableCell>
                    <TableCell>Valuation/Tree</TableCell>
                    <TableCell>Total Value</TableCell>
                    <TableCell>Coverage Ratio (%)</TableCell>
                    <TableCell>Threshold (%)</TableCell>
                    <TableCell>Last Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dummyCollateral.map(row => (
                    <TableRow key={row.farmId}>
                      <TableCell>{row.farmId}</TableCell>
                      <TableCell>{row.totalTrees}</TableCell>
                      <TableCell>{row.valuation}</TableCell>
                      <TableCell>{row.value}</TableCell>
                      <TableCell>{row.ratio}</TableCell>
                      <TableCell>{row.threshold}</TableCell>
                      <TableCell>{row.last}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Update valuation forms/buttons could go here */}
            </div>
          </TabsContent>
          <TabsContent value="config">
            <div className="p-4">
              <div className="text-xl font-bold mb-4">Vault Configuration</div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3">
                <div>MochaLand Token: <span className="text-blue-700">0xLandToken...</span></div>
                <div>MochaTree Token: <span className="text-green-700">0xTreeToken...</span></div>
                <div>Storage Address: <span className="text-purple-700">0xStorage...</span></div>
                <div>Collateral Ratio: 130%</div>
                <div>Maturity Period: 12-36 months</div>
                {/* Add update address/parameter forms here */}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="audits">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-bold">Event Log</div>
                <Input placeholder="Search events..." value={eventSearch} onChange={e => setEventSearch(e.target.value)} className="max-w-sm" />
              </div>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dummyEvents.filter(ev => 
                    ev.type.toLowerCase().includes(eventSearch.toLowerCase()) ||
                    ev.desc.toLowerCase().includes(eventSearch.toLowerCase())
                  ).map(ev => (
                    <TableRow key={ev.id}>
                      <TableCell>{ev.id}</TableCell>
                      <TableCell>{ev.type}</TableCell>
                      <TableCell>{ev.desc}</TableCell>
                      <TableCell>{ev.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
