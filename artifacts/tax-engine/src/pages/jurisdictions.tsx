import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListJurisdictions, 
  getListJurisdictionsQueryKey,
  useCreateJurisdiction,
  useUpdateJurisdiction,
  useDeleteJurisdiction,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/format";
import { Loader2, Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  code: z.string().min(1, "Code required"),
  region: z.enum(["EU", "US", "OTHER"]),
  taxType: z.enum(["VAT", "SALES_TAX"]),
  standardRate: z.coerce.number().min(0, "Must be positive"),
  reducedRate: z.coerce.number().optional().nullable(),
  currency: z.string().min(1, "Currency required"),
  active: z.boolean().default(true),
});

export default function Jurisdictions() {
  const { data: jurisdictions, isLoading } = useListJurisdictions();
  const deleteMutation = useDeleteJurisdiction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Delete this jurisdiction?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJurisdictionsQueryKey() });
          toast({ title: "Jurisdiction deleted" });
        }
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jurisdictions</h1>
          <p className="text-muted-foreground mt-2">Manage tax regions, authorities, and base rates.</p>
        </div>
        <JurisdictionDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region/Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tax Type</TableHead>
                  <TableHead className="text-right">Standard Rate</TableHead>
                  <TableHead className="text-right">Reduced Rate</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jurisdictions?.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>
                      <div className="font-mono text-sm">{j.code}</div>
                      <div className="text-xs text-muted-foreground">{j.region}</div>
                    </TableCell>
                    <TableCell className="font-medium">{j.name}</TableCell>
                    <TableCell>
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted">
                        {j.taxType}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(j.standardRate)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{j.reducedRate ? formatPercent(j.reducedRate) : "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{j.currency}</TableCell>
                    <TableCell>
                      {j.active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-600">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <JurisdictionDialog existing={j} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(j.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function JurisdictionDialog({ existing }: { existing?: any }) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateJurisdiction();
  const updateMutation = useUpdateJurisdiction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: existing || {
      name: "", code: "", region: "EU", taxType: "VAT", standardRate: 0, reducedRate: null, currency: "EUR", active: true
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJurisdictionsQueryKey() });
          toast({ title: "Jurisdiction updated" });
          setOpen(false);
        }
      });
    } else {
      createMutation.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJurisdictionsQueryKey() });
          toast({ title: "Jurisdiction created" });
          setOpen(false);
          form.reset();
        }
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing ? (
          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="w-4 h-4 mr-2" /> Add Jurisdiction</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Jurisdiction" : "New Jurisdiction"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Code (ISO)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="region" render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="EU">EU</SelectItem><SelectItem value="US">US</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="taxType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="VAT">VAT</SelectItem><SelectItem value="SALES_TAX">Sales Tax</SelectItem></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="standardRate" render={({ field }) => (
                <FormItem><FormLabel>Standard Rate (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="reducedRate" render={({ field }) => (
                <FormItem><FormLabel>Reduced Rate (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8">
                  <div className="space-y-0.5"><FormLabel>Active</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
