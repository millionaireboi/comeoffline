"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface AvatarCropModalProps {
  imageUrl: string;
  onConfirm: (croppedDataUrl: string) => void;
  onRetake: () => void;
}

const VIEWPORT = 260;

export default function AvatarCropModal({ imageUrl, onConfirm, onRetake }: AvatarCropModalProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use refs to avoid stale closures in event handlers
  const stateRef = useRef({ scale: 1, offset: { x: 0, y: 0 }, imgDims: null as { w: number; h: number } | null });
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; lastOx: number; lastOy: number }>({ dragging: false, startX: 0, startY: 0, lastOx: 0, lastOy: 0 });
  const pinchRef = useRef<number | null>(null);

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = { scale, offset, imgDims }; });

  const clampOffset = (off: { x: number; y: number }, s: number, dims: { w: number; h: number }) => {
    const maxX = Math.max(0, (dims.w * s - VIEWPORT) / 2);
    const maxY = Math.max(0, (dims.h * s - VIEWPORT) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, off.x)), y: Math.max(-maxY, Math.min(maxY, off.y)) };
  };

  const updateState = (newScale: number, newOffset: { x: number; y: number }) => {
    setScale(newScale);
    setOffset(newOffset);
  };

  const onImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const nat = { w: img.naturalWidth, h: img.naturalHeight };
    const fitScale = VIEWPORT / Math.min(nat.w, nat.h);
    setImgDims({ w: nat.w * fitScale, h: nat.h * fitScale });
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Use native touch events to avoid pointer+touch double-fire on mobile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getTouchDist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // prevent scroll & pull-to-refresh
      const { offset: curOffset } = stateRef.current;
      if (e.touches.length === 2) {
        pinchRef.current = getTouchDist(e.touches);
      } else if (e.touches.length === 1) {
        dragRef.current = { dragging: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, lastOx: curOffset.x, lastOy: curOffset.y };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const { scale: curScale, imgDims: dims } = stateRef.current;
      if (!dims) return;

      if (e.touches.length === 2 && pinchRef.current !== null) {
        const newDist = getTouchDist(e.touches);
        const ratio = newDist / pinchRef.current;
        const newScale = Math.max(1, Math.min(3, curScale * ratio));
        pinchRef.current = newDist;
        const newOffset = clampOffset(stateRef.current.offset, newScale, dims);
        updateState(newScale, newOffset);
      } else if (e.touches.length === 1 && dragRef.current.dragging) {
        const dx = e.touches[0].clientX - dragRef.current.startX;
        const dy = e.touches[0].clientY - dragRef.current.startY;
        const { scale: s } = stateRef.current;
        setOffset(clampOffset({ x: dragRef.current.lastOx + dx, y: dragRef.current.lastOy + dy }, s, dims));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
      if (e.touches.length === 0) dragRef.current.dragging = false;
    };

    // Mouse drag (desktop)
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const { offset: curOffset } = stateRef.current;
      dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, lastOx: curOffset.x, lastOy: curOffset.y };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const { scale: s, imgDims: dims } = stateRef.current;
      if (!dims) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setOffset(clampOffset({ x: dragRef.current.lastOx + dx, y: dragRef.current.lastOy + dy }, s, dims));
    };

    const handleMouseUp = () => { dragRef.current.dragging = false; };

    // Scroll wheel zoom (desktop)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { scale: curScale, imgDims: dims } = stateRef.current;
      if (!dims) return;
      const newScale = Math.max(1, Math.min(3, curScale - e.deltaY * 0.002));
      const newOffset = clampOffset(stateRef.current.offset, newScale, dims);
      updateState(newScale, newOffset);
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      el.removeEventListener("wheel", handleWheel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- stateRef avoids stale closures

  const handleConfirm = useCallback(() => {
    if (!imgDims) return;
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    const outputSize = 800;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d")!;

    const nat = { w: img.naturalWidth, h: img.naturalHeight };
    const fitScale = VIEWPORT / Math.min(nat.w, nat.h);

    const visibleSizeNat = VIEWPORT / (fitScale * scale);
    const centerNatX = nat.w / 2 - offset.x / (fitScale * scale);
    const centerNatY = nat.h / 2 - offset.y / (fitScale * scale);

    const sx = Math.max(0, centerNatX - visibleSizeNat / 2);
    const sy = Math.max(0, centerNatY - visibleSizeNat / 2);
    const sw = Math.min(visibleSizeNat, nat.w - sx);
    const sh = Math.min(visibleSizeNat, nat.h - sy);

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
    onConfirm(canvas.toDataURL("image/jpeg", 0.85));
  }, [imgDims, scale, offset, onConfirm]);

  return (
    <div className="animate-fadeIn fixed inset-0 z-50 flex flex-col bg-gate-black" style={{ touchAction: "none" }}>
      <div className="px-7 pt-16">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[3px] text-muted">position your photo</p>
        <p className="font-sans text-[12px]" style={{ color: "rgba(155,142,130,0.5)" }}>pinch to zoom · drag to reposition</p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-full"
          style={{ width: VIEWPORT, height: VIEWPORT, border: "3px solid rgba(212,165,116,0.25)", cursor: "grab" }}
        >
          {imgDims && (
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              draggable={false}
              onLoad={onImageLoad}
              className="pointer-events-none absolute select-none"
              style={{
                width: imgDims.w * scale,
                height: imgDims.h * scale,
                left: (VIEWPORT - imgDims.w * scale) / 2 + offset.x,
                top: (VIEWPORT - imgDims.h * scale) / 2 + offset.y,
              }}
            />
          )}
          {!imgDims && (
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              onLoad={onImageLoad}
              className="invisible absolute"
            />
          )}
        </div>
      </div>

      <div className="flex gap-3 px-7 pb-10">
        <button
          onClick={onRetake}
          className="flex-1 rounded-2xl py-[18px] font-sans text-base text-muted transition-all"
          style={{ border: "1.5px solid rgba(155,142,130,0.19)" }}
        >
          retake
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 rounded-2xl py-[18px] font-sans text-base font-medium transition-all"
          style={{ background: "#FAF6F0", color: "#0E0D0B" }}
        >
          looks good
        </button>
      </div>
    </div>
  );
}
