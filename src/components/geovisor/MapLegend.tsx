export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
      <h4 className="font-semibold text-sm mb-2">Leyenda</h4>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span>Dentro de geocerca</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>Fuera de geocerca</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Ubicación antigua (&gt;2h)</span>
        </div>
      </div>
    </div>
  );
}
