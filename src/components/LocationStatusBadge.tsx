import { MapPin, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LocationStatusBadgeProps {
  lastUpdate: Date | null;
  pendingCount: number;
  isTracking: boolean;
  error: string | null;
}

export function LocationStatusBadge({
  lastUpdate,
  pendingCount,
  isTracking,
  error,
}: LocationStatusBadgeProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (isTracking) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm animate-pulse">
        <MapPin className="h-4 w-4" />
        <span>Obteniendo ubicación...</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
        <Clock className="h-4 w-4" />
        <span>🟡 Pendiente de sincronizar ({pendingCount})</span>
      </div>
    );
  }

  if (lastUpdate) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg text-sm">
        <MapPin className="h-4 w-4" />
        <span>
          📍 Ubicación actualizada a las {format(lastUpdate, 'HH:mm', { locale: es })}
        </span>
      </div>
    );
  }

  return null;
}
