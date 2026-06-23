import React from "react";
import { useGetDashboardSummary, useGetTaxByJurisdiction, useGetRecentTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/format";
import { Globe, DollarSign, Receipt, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: byJurisdiction, isLoading: isLoadingJurisdictions } = useGetTaxByJurisdiction();
  const { data: recent, isLoading: isLoadingRecent } = useGetRecentTransactions();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-2">Global indirect tax compliance snapshot.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Tax Liability</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatMoney(summary?.totalTax, "USD")}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Across all jurisdictions</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Net Transaction Volume</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatMoney(summary?.totalNet, "USD")}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{summary?.transactionCount || 0} transactions</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">EU vs US Split</CardTitle>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-full" /> : (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">EU VAT</span>
                  <span className="font-medium">{formatMoney(summary?.euTax, "EUR")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">US Sales</span>
                  <span className="font-medium">{formatMoney(summary?.usTax, "USD")}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Reverse Charge</CardTitle>
            <Percent className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{summary?.reverseChargeCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">B2B zero-rated transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Tax by Jurisdiction</CardTitle>
            <CardDescription>Highest liability regions</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoadingJurisdictions ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {byJurisdiction?.map((j) => (
                  <div key={j.jurisdictionCode} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{j.jurisdictionName}</div>
                      <div className="text-xs text-muted-foreground">{j.taxType} &middot; {j.transactionCount} txns</div>
                    </div>
                    <div className="font-mono text-sm font-medium">
                      {formatMoney(j.totalTax, j.currency)}
                    </div>
                  </div>
                ))}
                {!byJurisdiction?.length && (
                  <div className="text-sm text-muted-foreground py-8 text-center">No data available</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest engine calculations</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoadingRecent ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {recent?.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium font-mono text-sm">{tx.reference}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>{formatDate(tx.transactionDate)}</span>
                        <span>&middot;</span>
                        <span>{tx.sellerCountry} &rarr; {tx.buyerCountry}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">
                        {formatMoney(tx.taxAmount, tx.currency)}
                      </div>
                      <div className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium inline-block mt-1">
                        {tx.taxTreatment}
                      </div>
                    </div>
                  </div>
                ))}
                {!recent?.length && (
                  <div className="text-sm text-muted-foreground py-8 text-center">No recent transactions</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
