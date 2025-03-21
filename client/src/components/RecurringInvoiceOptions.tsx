import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

interface RecurringInvoiceOptionsProps {
  generateSingleInvoice: boolean;
  onGenerateSingleInvoiceChange: (value: boolean) => void;
}

export default function RecurringInvoiceOptions({
  generateSingleInvoice,
  onGenerateSingleInvoiceChange
}: RecurringInvoiceOptionsProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Options de facturation</CardTitle>
        <CardDescription>
          Choisissez comment facturer les rendez-vous récurrents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="generate-single-invoice">
              Facture unique pour tous les rendez-vous
            </Label>
            <p className="text-sm text-muted-foreground">
              {generateSingleInvoice 
                ? "Une seule facture sera générée pour tous les rendez-vous récurrents" 
                : "Une facture individuelle sera générée pour chaque rendez-vous récurrent"}
            </p>
          </div>
          <Switch
            id="generate-single-invoice"
            checked={generateSingleInvoice}
            onCheckedChange={onGenerateSingleInvoiceChange}
          />
        </div>
        {generateSingleInvoice ? (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>Facture unique</strong> : Une seule facture regroupant toutes les séances sera générée. 
              Le montant total sera calculé automatiquement, et toutes les dates de rendez-vous seront indiquées dans la facture.
            </p>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Factures individuelles</strong> : Une facture distincte sera générée pour chaque rendez-vous. 
              Cela peut être utile pour les remboursements individuels ou lorsque le patient souhaite des factures séparées.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}