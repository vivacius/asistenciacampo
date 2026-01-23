import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Clock, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getMarkerColor, getLocationAgeHours } from '@/lib/geocerca-utils';
import { OperarioLocation } from '@/hooks/useRealtimeLocations';
import { cn } from '@/lib/utils';

interface OperariosListProps {
  locations: OperarioLocation[];
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
}

export function OperariosList({ locations, selectedUserId, onSelect }: OperariosListProps) {
  const sortedLocations = [...locations].sort((a, b) => {
    // Sort by most recent first
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="bg-background border rounded-lg h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">
          Operarios ({locations.length})
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedLocations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay ubicaciones registradas
            </p>
          ) : (
            sortedLocations.map(location => {
              const color = getMarkerColor(location.fuera_zona, location.timestamp);
              const ageHours = getLocationAgeHours(location.timestamp);
              const isSelected = selectedUserId === location.user_id;

              return (
                <button
                  key={location.user_id}
                  onClick={() => onSelect(isSelected ? null : location.user_id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    "hover:bg-accent",
                    isSelected && "bg-accent ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-1 w-3 h-3 rounded-full flex-shrink-0",
                      color === 'green' && "bg-green-500",
                      color === 'red' && "bg-red-500",
                      color === 'yellow' && "bg-yellow-500"
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {location.profile?.nombre || 'Usuario'}
                      </p>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(location.timestamp), 'HH:mm', { locale: es })}
                          {ageHours > 1 && ` (hace ${Math.round(ageHours)}h)`}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs mt-0.5">
                        {location.fuera_zona ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <span className="text-red-500">Fuera de zona</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3 text-green-500" />
                            <span className="text-green-500">En zona</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
