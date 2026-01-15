import { useRef, useCallback, useState } from 'react';
import imageCompression from 'browser-image-compression';

interface CameraState {
  isCapturing: boolean;
  error: string | null;
}

export function useCamera() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<CameraState>({
    isCapturing: false,
    error: null,
  });

  const capturePhoto = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      // Remove existing input if any
      if (inputRef.current) {
        document.body.removeChild(inputRef.current);
        inputRef.current = null;
      }

      // Create fresh input element for each capture
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      // For iOS Safari, we need to be more specific
      // Setting capture="user" should open front camera directly
      input.setAttribute('capture', 'user');
      
      input.style.position = 'fixed';
      input.style.top = '-9999px';
      input.style.left = '-9999px';
      input.style.opacity = '0';
      document.body.appendChild(input);
      inputRef.current = input;

      setState({ isCapturing: true, error: null });

      let isResolved = false;

      const cleanup = () => {
        if (inputRef.current && inputRef.current.parentNode) {
          document.body.removeChild(inputRef.current);
        }
        inputRef.current = null;
      };

      input.onchange = async (e) => {
        if (isResolved) return;
        isResolved = true;

        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
          cleanup();
          setState({ isCapturing: false, error: 'No se capturó ninguna foto' });
          reject(new Error('No se capturó ninguna foto'));
          return;
        }

        try {
          // Compress the image for field use (max 500KB)
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          });

          cleanup();
          setState({ isCapturing: false, error: null });
          resolve(compressedFile);
        } catch (error) {
          cleanup();
          const errorMessage = 'Error procesando la foto';
          setState({ isCapturing: false, error: errorMessage });
          reject(new Error(errorMessage));
        }
      };

      // Handle cancel - use a more reliable method for iOS
      const handleVisibilityChange = () => {
        // Small delay to allow file selection to complete
        setTimeout(() => {
          if (!isResolved && (!input.files || input.files.length === 0)) {
            isResolved = true;
            cleanup();
            setState({ isCapturing: false, error: null });
            reject(new Error('Captura cancelada'));
          }
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }, 1000);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Also handle focus for desktop browsers
      const handleFocus = () => {
        setTimeout(() => {
          if (!isResolved && (!input.files || input.files.length === 0)) {
            isResolved = true;
            cleanup();
            setState({ isCapturing: false, error: null });
            reject(new Error('Captura cancelada'));
          }
          window.removeEventListener('focus', handleFocus);
        }, 500);
      };

      window.addEventListener('focus', handleFocus);

      // Trigger file picker/camera
      input.click();
    });
  }, []);

  return {
    ...state,
    capturePhoto,
  };
}
