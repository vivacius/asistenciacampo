import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseExcelGeocercas, ParsedGeocerca } from '@/lib/wkt-parser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeocercaImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'processing' | 'preview' | 'importing' | 'complete' | 'error';

export function GeocercaImporter({ open, onOpenChange, onImportComplete }: GeocercaImporterProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [progress, setProgress] = useState(0);
  const [geocercas, setGeocercas] = useState<ParsedGeocerca[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setProgress(0);
    setGeocercas([]);
    setError(null);
    setImportProgress(0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      setStep('error');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const parsed = await parseExcelGeocercas(file, (processed, total) => {
        setProgress(Math.round((processed / total) * 100));
      });

      if (parsed.length === 0) {
        setError('No se encontraron geocercas válidas en el archivo');
        setStep('error');
        return;
      }

      setGeocercas(parsed);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing file:', err);
      setError('Error al procesar el archivo. Verifica que el formato sea correcto.');
      setStep('error');
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);

    try {
      // Import in batches of 50
      const batchSize = 50;
      const total = geocercas.length;
      let imported = 0;

      for (let i = 0; i < geocercas.length; i += batchSize) {
        const batch = geocercas.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('geocercas')
          .insert(batch.map(g => ({
            nombre: g.nombre,
            tipo: g.tipo,
            coordenadas: JSON.parse(JSON.stringify(g.coordenadas)),
            color: g.color,
            activa: g.activa
          })));

        if (insertError) {
          throw insertError;
        }

        imported += batch.length;
        setImportProgress(Math.round((imported / total) * 100));
      }

      setStep('complete');
      toast.success(`${geocercas.length} geocercas importadas exitosamente`);
    } catch (err) {
      console.error('Error importing geocercas:', err);
      setError('Error al importar las geocercas. Por favor intenta de nuevo.');
      setStep('error');
    }
  };

  const handleClose = () => {
    if (step === 'complete') {
      onImportComplete();
    }
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Geocercas
          </DialogTitle>
          <DialogDescription>
            Importa geocercas desde un archivo Excel con coordenadas en formato WKT.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Upload step */}
          {step === 'upload' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-muted p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Selecciona un archivo Excel con las columnas:<br />
                <span className="font-medium">NOM, Hac_Ste, geometry_wkt</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                Seleccionar Archivo
              </Button>
            </div>
          )}

          {/* Processing step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Procesando archivo...</p>
              <div className="w-full max-w-xs">
                <Progress value={progress} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground">{progress}% completado</p>
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {geocercas.length} geocercas encontradas
                </p>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  Cambiar archivo
                </Button>
              </div>
              
              <ScrollArea className="h-64 rounded-md border">
                <div className="p-4 space-y-2">
                  {geocercas.slice(0, 20).map((g, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 text-sm"
                    >
                      <div 
                        className="h-3 w-3 rounded-full shrink-0" 
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="truncate">{g.nombre}</span>
                      <span className="text-muted-foreground text-xs ml-auto shrink-0">
                        {g.coordenadas.length} puntos
                      </span>
                    </div>
                  ))}
                  {geocercas.length > 20 && (
                    <p className="text-xs text-muted-foreground pt-2">
                      ... y {geocercas.length - 20} más
                    </p>
                  )}
                </div>
              </ScrollArea>

              <p className="text-xs text-muted-foreground">
                Las coordenadas serán transformadas de EPSG:3116 a WGS84 (GPS).
              </p>
            </div>
          )}

          {/* Importing step */}
          {step === 'importing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Importando geocercas...</p>
              <div className="w-full max-w-xs">
                <Progress value={importProgress} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground">{importProgress}% completado</p>
            </div>
          )}

          {/* Complete step */}
          {step === 'complete' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-green-100 p-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm font-medium">¡Importación completada!</p>
              <p className="text-xs text-muted-foreground">
                {geocercas.length} geocercas importadas exitosamente
              </p>
            </div>
          )}

          {/* Error step */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-xs text-muted-foreground text-center">{error}</p>
              <Button variant="outline" onClick={resetState}>
                Intentar de nuevo
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleImport}>
                Importar {geocercas.length} geocercas
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
