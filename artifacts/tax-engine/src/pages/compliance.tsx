import { useGetFilingSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { Loader2, FileCheck, Building2, Calendar } from "lucide-react";

export default function Compliance() {
  const { data: summaries, isLoading } = useGetFilingSummary();

  // Group by period
  const periods = summaries?.reduce((acc, curr) => {
    if (!acc[curr.period]) acc[curr.period] = [];
    acc[curr.period].push(curr);
    return acc;
  }, {} as Record<string, typeof summaries>);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance Reporting</h1>
        <p className="text-muted-foreground mt-2">Aggregated liability ready for tax authority filing.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-8">
          {Object.entries(periods || {}).sort((a, b) => b[0].localeCompare(a[0])).map(([period, items]) => (
            <Card key={period} className="shadow-sm">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <CardTitle>Period: {period}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Authority</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Net Subject to Tax</TableHead>
                      <TableHead className="text-right text-primary font-bold">Tax Collected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {item.jurisdictionName}
                          </div>
                          <div className="text-xs text-muted-foreground ml-6 font-mono">{item.jurisdictionCode}</div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted">
                            {item.taxType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{item.transactionCount}</TableCell>
                        <TableCell className="text-right font-mono">{formatMoney(item.netAmount, item.currency)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">{formatMoney(item.taxAmount, item.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
          {!summaries?.length && (
            <Card className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/10">
              <FileCheck className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Compliance Data</h3>
              <p className="max-w-sm">Calculated transactions will roll up into monthly periods automatically.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
