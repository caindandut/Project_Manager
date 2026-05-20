import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

interface AvatarCropDialogProps {
  imageSrc: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrop: (croppedBlob: Blob) => void;
  isUploading?: boolean;
}

export default function AvatarCropDialog({
  imageSrc,
  open,
  onOpenChange,
  onCrop,
  isUploading = false,
}: AvatarCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when a new image is loaded or dialog opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  // Handle Drag / Pan logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch Support for mobile device users
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - offset.x, y: touch.clientY - offset.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y,
    });
  };

  const handleSave = () => {
    const img = imageRef.current;
    if (!img) return;

    // Create a 300x300 canvas for the cropped avatar
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable high-quality image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // base scale to cover the canvas
    const s0 = Math.max(300 / naturalWidth, 300 / naturalHeight);
    const w0 = naturalWidth * s0;
    const h0 = naturalHeight * s0;

    // scale with zoom
    const w = w0 * zoom;
    const h = h0 * zoom;

    // crop box in UI is 200px, canvas is 300px -> scale ratio is 1.5
    const r = 300 / 200;
    const ox = offset.x * r;
    const oy = offset.y * r;

    // draw image centered with offsets
    const x = 150 - w / 2 + ox;
    const y = 150 - h / 2 + oy;

    ctx.drawImage(img, x, y, w, h);

    // Convert to Blob and send back
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cắt ảnh đại diện</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-6 py-4">
          {/* Crop Container */}
          <div
            ref={containerRef}
            className="relative h-[280px] w-full overflow-hidden rounded-lg border bg-zinc-950 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
          >
            {/* Image to crop */}
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="absolute max-w-none origin-center pointer-events-none transition-transform duration-75"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  maxHeight: '100%',
                }}
              />
            )}

            {/* Circular Crop Overlay Mask */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Dimmed surrounding */}
              <div className="absolute inset-0 bg-black/60" />
              {/* Circular cutout */}
              <div
                className="relative h-[200px] w-[200px] rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                style={{ zIndex: 10 }}
              />
            </div>

            {/* Micro Pan Indicator */}
            <div className="absolute bottom-2 left-2 flex items-center space-x-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white pointer-events-none">
              <Move className="h-3 w-3" />
              <span>Kéo để di chuyển</span>
            </div>
          </div>

          {/* Zoom Control Slider */}
          <div className="flex w-full items-center space-x-3 px-2">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary transition-all [&::-webkit-slider-runnable-track]:bg-secondary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:appearance-none"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground w-8 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Hủy
          </Button>
          <Button type="button" onClick={handleSave} disabled={isUploading}>
            {isUploading ? 'Đang lưu...' : 'Cắt & Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
