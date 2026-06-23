import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListTransactions, 
  getListTransactionsQueryKey,
  useDeleteTransaction,
  useCreateTransaction,
  useListJurisdictions,
  useListCategories
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate, formatPercent } from "@/lib/format";
import { Loader2, Plus, Trash2, FileText, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  transactionDate: z.string().min(1, "Date is required"),
  sellerCountry: z.string().min(1, "Seller is required"),
  buyerCountry: z.string().min(1, "Buyer is required"),
  customerType: z.enum(["B2B", "B2C"]),
  customerVatId: z.string().optional(),
  categoryId: z.coerce.number().min(1, "Category is required"),
  netAmount: z.coerce.number().min(0.01, "Amount must be positive"),
  notes: z.string().optional()
});

export default function Transactions() {
  const { data: transactions, isLoading } = useListTransactions();
  const deleteTx = useDeleteTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      deleteTx.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          toast({ title: "Transaction deleted", description: "The record was removed permanently." });
        }
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions Ledger</h1>
          <p className="text-muted-foreground mt-2">Searchable list of all calculated and stored tax events.</p>
        </div>
        <CreateTransactionDialog />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Records</CardTitle>
              <CardDescription>System of record for indirect tax compliance</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search references..." className="pl-9 bg-muted/30" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Ref</TableHead>
                  <TableHead>Flow</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((tx) => (
                  <TableRow key={tx.id} className="group cursor-pointer">
                    <TableCell>
                      <div className="font-medium font-mono text-sm">{tx.reference}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(tx.transactionDate)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{tx.sellerCountry} &rarr; {tx.buyerCountry}</div>
                      <div className="text-xs text-muted-foreground">{tx.customerType} &middot; {tx.categoryName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {tx.taxTreatment}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={tx.explanation || ""}>
                        {formatPercent(tx.taxRate * 100)} - {tx.explanation}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(tx.netAmount, tx.currency)}</TableCell>
                    <TableCell className="text-right font-mono text-primary font-medium">{formatMoney(tx.taxAmount, tx.currency)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatMoney(tx.grossAmount, tx.currency)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!transactions?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateTransactionDialog() {
  const [open, setOpen] = useState(false);
  const { data: jurisdictions } = useListJurisdictions();
  const { data: categories } = useListCategories();
  const createTx = useCreateTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reference: `TXN-${Math.floor(Math.random()*100000)}`,
      transactionDate: new Date().toISOString().split('T')[0],
      sellerCountry: "",
      buyerCountry: "",
      customerType: "B2B",
      customerVatId: "",
      categoryId: 0,
      netAmount: 0,
      notes: ""
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createTx.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        toast({ title: "Transaction recorded", description: "Tax calculation successful." });
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Record Transaction</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record New Transaction</DialogTitle>
          <DialogDescription>Submit a transaction to run it through the tax engine and persist the result.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="reference" render={({ field }) => (
                <FormItem><FormLabel>Reference ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="transactionDate" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="sellerCountry" render={({ field }) => (
                <FormItem>
                  <FormLabel>Seller Jurisdiction</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                    <SelectContent>{jurisdictions?.map(j => <SelectItem key={j.id} value={j.code}>{j.code}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="buyerCountry" render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer Jurisdiction</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                    <SelectContent>{jurisdictions?.map(j => <SelectItem key={j.id} value={j.code}>{j.code}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="customerType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="B2B">B2B</SelectItem><SelectItem value="B2C">B2C</SelectItem></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="customerVatId" render={({ field }) => (
                <FormItem><FormLabel>VAT ID (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                    <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="netAmount" render={({ field }) => (
                <FormItem><FormLabel>Net Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createTx.isPending}>
                {createTx.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Calculate & Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
