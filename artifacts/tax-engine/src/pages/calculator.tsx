import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCalculateTax, useListJurisdictions, useListCategories } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator as CalcIcon, ShieldCheck, ArrowRight, Loader2, Info } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/format";

const formSchema = z.object({
  sellerCountry: z.string().min(1, "Seller country is required"),
  buyerCountry: z.string().min(1, "Buyer country is required"),
  customerType: z.enum(["B2B", "B2C"]),
  customerVatId: z.string().optional(),
  categoryId: z.coerce.number().min(1, "Category is required"),
  netAmount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
});

export default function Calculator() {
  const { data: jurisdictions, isLoading: loadingJurisdictions } = useListJurisdictions();
  const { data: categories, isLoading: loadingCategories } = useListCategories();
  const calculateTax = useCalculateTax();
  const [result, setResult] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sellerCountry: "",
      buyerCountry: "",
      customerType: "B2B",
      customerVatId: "",
      netAmount: 0,
      categoryId: 0,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    calculateTax.mutate({ data: values }, {
      onSuccess: (data) => {
        setResult(data);
      }
    });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tax Engine</h1>
        <p className="text-muted-foreground mt-2">Instantly compute global tax rules, rates, and liability.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalcIcon className="w-5 h-5 text-primary" />
                Calculation Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sellerCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Origin (Seller)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingJurisdictions}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {jurisdictions?.map(j => (
                                <SelectItem key={`sell-${j.id}`} value={j.code}>{j.code} - {j.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="buyerCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination (Buyer)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingJurisdictions}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {jurisdictions?.map(j => (
                                <SelectItem key={`buy-${j.id}`} value={j.code}>{j.code} - {j.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="B2B">B2B (Business)</SelectItem>
                              <SelectItem value="B2C">B2C (Consumer)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerVatId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer VAT ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()} disabled={loadingCategories}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product category..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="netAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Net Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full mt-4" disabled={calculateTax.isPending}>
                    {calculateTax.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Compute Liability"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          {result ? (
            <Card className="h-full border-primary/20 shadow-md bg-gradient-to-b from-card to-card/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex justify-between items-center">
                  <span>Calculation Result</span>
                  <div className="px-2.5 py-1 text-xs font-semibold rounded bg-primary/10 text-primary uppercase tracking-wider">
                    {result.taxTreatment.replace("_", " ")}
                  </div>
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-primary/80 mt-2">
                  <ShieldCheck className="w-4 h-4" /> Trusted output for {result.jurisdictionCode || "Origin"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/40 border border-muted flex items-start gap-3 text-sm leading-relaxed">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-muted-foreground"><span className="text-foreground font-medium">Applied Rule:</span> {result.explanation}</p>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
                    <p className="text-2xl font-mono">{formatMoney(result.netAmount, result.currency)}</p>
                  </div>
                  <div className="space-y-1 relative">
                    <div className="absolute top-1/2 -left-6 -translate-y-1/2 text-muted-foreground">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Tax ({formatPercent(result.taxRate * 100)})</p>
                    <p className="text-2xl font-mono text-primary font-bold">+{formatMoney(result.taxAmount, result.currency)}</p>
                  </div>
                  <div className="space-y-1 relative">
                    <div className="absolute top-1/2 -left-6 -translate-y-1/2 text-muted-foreground">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Gross Amount</p>
                    <p className="text-2xl font-mono">{formatMoney(result.grossAmount, result.currency)}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-6 border-t mt-auto text-xs text-muted-foreground">
                Rates derived from current configured jurisdictions.
              </CardFooter>
            </Card>
          ) : (
            <Card className="h-full border-dashed flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/10">
              <CalcIcon className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-2">Awaiting Parameters</h3>
              <p className="max-w-sm">Enter transaction details on the left to compute tax liability, jurisdiction rules, and applicable rates.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
