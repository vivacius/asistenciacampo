import { MapPin, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { OperarioLocation } from '@/hooks/useRealtimeLocations';
import { getLocationAgeHours } from '@/lib/geocerca-utils';

interface MetricsPanelProps {
  locations: OperarioLocation[];
}

export function MetricsPanel({ locations }: MetricsPanelProps) {
  const STALE_THRESHOLD_HOURS = 2;

  const metrics = locations.reduce(
    (acc, loc) => {
      const ageHours = getLocationAgeHours(loc.timestamp);
      
      if (ageHours > STALE_THRESHOLD_HOURS) {
        acc.sinReporte++;
      } else if (loc.fuera_zona) {
        acc.fueraZona++;
      } else {
        acc.enZona++;
      }
      return acc;
    },
    { enZona: 0, fueraZona: 0, sinReporte: 0 }
  );

  const total = locations.length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="bg-green-500/10 border-green-500/30">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-500/20">
            <MapPin className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{metrics.enZona}</p>
            <p className="text-xs text-muted-foreground">En zona</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{metrics.fueraZona}</p>
            <p className="text-xs text-muted-foreground">Fuera de zona</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-yellow-500/20">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{metrics.sinReporte}</p>
            <p className="text-xs text-muted-foreground">Sin reporte (+2h)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
