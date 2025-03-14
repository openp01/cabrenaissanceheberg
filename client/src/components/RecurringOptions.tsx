import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RecurringOptionsProps {
  isRecurring: boolean;
  recurringFrequency: string;
  recurringCount: number;
  recurringDates: string[];
  onRecurringChange: (value: boolean) => void;
  onFrequencyChange: (value: string) => void;
  onCountChange: (value: number) => void;
}

export default function RecurringOptions({
  isRecurring,
  recurringFrequency,
  recurringCount,
  recurringDates,
  onRecurringChange,
  onFrequencyChange,
  onCountChange,
}: RecurringOptionsProps) {
  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center mb-4">
        <Checkbox 
          id="recurringOption" 
          checked={isRecurring}
          onCheckedChange={(checked) => onRecurringChange(checked as boolean)}
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <Label
          htmlFor="recurringOption"
          className="ml-2 block text-sm text-gray-900"
        >
          Séances récurrentes
        </Label>
      </div>
      
      {isRecurring && (
        <div className="pl-6 mt-2">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Label htmlFor="recurringFrequency" className="block text-sm font-medium text-gray-700">
                Fréquence
              </Label>
              <Select 
                value={recurringFrequency} 
                onValueChange={onFrequencyChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hebdomadaire">Hebdomadaire</SelectItem>
                  <SelectItem value="Bimensuel">Bimensuel</SelectItem>
                  <SelectItem value="Mensuel">Mensuel</SelectItem>
                  <SelectItem value="Annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="recurringCount" className="block text-sm font-medium text-gray-700">
                Nombre de séances
              </Label>
              <Select 
                value={recurringCount.toString()} 
                onValueChange={(value) => onCountChange(parseInt(value))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner le nombre de séances" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 séances</SelectItem>
                  <SelectItem value="3">3 séances</SelectItem>
                  <SelectItem value="4">4 séances</SelectItem>
                  <SelectItem value="5">5 séances</SelectItem>
                  <SelectItem value="6">6 séances</SelectItem>
                  <SelectItem value="12">12 séances</SelectItem>
                  <SelectItem value="24">24 séances</SelectItem>
                  <SelectItem value="52">52 séances</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {recurringDates.length > 0 && (
            <div className="mt-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h5 className="text-sm font-medium text-gray-900">Aperçu des dates</h5>
                <ul className="mt-2 text-sm text-gray-500 space-y-1">
                  {recurringDates.map((date, index) => (
                    <li key={index} className="flex items-center">
                      <span className="material-icons text-xs mr-2 text-primary">event</span>
                      {date}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
