import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface MultipleTimeSlotsOptionsProps {
  isMultipleTimeSlots: boolean;
  selectedTimeSlots: Array<{date: string, time: string}>;
  onMultipleTimeSlotsChange: (value: boolean) => void;
}

export default function MultipleTimeSlotsOptions({
  isMultipleTimeSlots,
  selectedTimeSlots,
  onMultipleTimeSlotsChange,
}: MultipleTimeSlotsOptionsProps) {
  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center mb-4">
        <Checkbox 
          id="multipleTimeSlotsOption" 
          checked={isMultipleTimeSlots}
          onCheckedChange={(checked) => onMultipleTimeSlotsChange(checked as boolean)}
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <Label
          htmlFor="multipleTimeSlotsOption"
          className="ml-2 block text-sm text-gray-900"
        >
          Réserver plusieurs créneaux horaires
        </Label>
      </div>
      
      {isMultipleTimeSlots && selectedTimeSlots.length > 0 && (
        <div className="pl-6 mt-2">
          <div className="bg-gray-50 p-4 rounded-md">
            <h5 className="text-sm font-medium text-gray-900">Créneaux sélectionnés</h5>
            <ul className="mt-2 text-sm text-gray-500 space-y-1">
              {selectedTimeSlots.map((slot, index) => (
                <li key={index} className="flex items-center">
                  <span className="material-icons text-xs mr-2 text-primary">schedule</span>
                  {slot.date} à {slot.time}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}