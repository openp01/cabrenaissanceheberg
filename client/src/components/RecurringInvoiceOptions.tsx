import { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecurringInvoiceOptionsProps {
  generateSingleInvoice: boolean;
  onGenerateSingleInvoiceChange: (value: boolean) => void;
}

export default function RecurringInvoiceOptions({
  generateSingleInvoice,
  onGenerateSingleInvoiceChange
}: RecurringInvoiceOptionsProps) {
  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-md flex items-center">
          Options de facturation pour rendez-vous récurrents
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Choisissez comment facturer les rendez-vous récurrents.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Choisissez entre une facture unique groupée ou des factures individuelles pour chaque séance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="invoice-type">Facture unique pour toutes les séances</Label>
            <p className="text-sm text-muted-foreground">
              {generateSingleInvoice
                ? "Une seule facture sera générée pour toutes les séances, avec le détail de chaque date."
                : "Une facture individuelle sera générée pour chaque séance."}
            </p>
          </div>
          <Switch
            id="invoice-type"
            checked={generateSingleInvoice}
            onCheckedChange={onGenerateSingleInvoiceChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}