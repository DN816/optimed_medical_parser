import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageViewerProps {
  imageSrc: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageSrc }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string;
    
    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const token = localStorage.getItem('access_token');
        // Construct full URL using env or default
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
        const fullUrl = imageSrc.startsWith('http') ? imageSrc : `${baseUrl}${imageSrc}`;
        
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to load image');
        
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error("Error loading image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (imageSrc) {
      fetchImage();
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageSrc]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-inner">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Original Document</span>
        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1"></div>
          <button onClick={handleRotate} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition">
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 text-slate-400">
            <p>Failed to load image</p>
          </div>
        )}

        {blobUrl && !error && (
          <div 
            className="transition-transform duration-200 ease-out origin-center shadow-2xl"
            style={{ 
              transform: `scale(${scale}) rotate(${rotation}deg)` 
            }}
          >
            <img 
              src={blobUrl} 
              alt="Uploaded Bill" 
              className="max-w-full max-h-none object-contain rounded bg-white"
              style={{ maxWidth: '100%' }} // Initial constraint
            />
          </div>
        )}
      </div>
    </div>
  );
}