import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PropertyGalleryProps {
  images: string[];
  title: string;
  fallbackImage?: string;
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({
  images,
  title,
  fallbackImage = "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
}) => {
  const displayImages = images && images.length > 0 ? images : [fallbackImage];
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isProgrammaticScroll = useRef(false);

  // Sync scroll position when activeIndex changes
  const scrollToImage = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const itemWidth = container.clientWidth;
    if (itemWidth > 0) {
      isProgrammaticScroll.current = true;
      container.scrollTo({
        left: index * itemWidth,
        behavior,
      });
      // Reset flag after animation completes
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 450);
    }
  }, []);

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const nextIdx = (activeIndex + 1) % displayImages.length;
      setActiveIndex(nextIdx);
      scrollToImage(nextIdx);
    },
    [activeIndex, displayImages.length, scrollToImage]
  );

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const prevIdx = (activeIndex - 1 + displayImages.length) % displayImages.length;
      setActiveIndex(prevIdx);
      scrollToImage(prevIdx);
    },
    [activeIndex, displayImages.length, scrollToImage]
  );

  const handleSelectDot = (index: number) => {
    setActiveIndex(index);
    scrollToImage(index);
  };

  // Listen to native scroll / touch swiping to update active index
  const handleScroll = () => {
    if (isProgrammaticScroll.current || !carouselRef.current) return;
    const container = carouselRef.current;
    const scrollPosition = container.scrollLeft;
    const itemWidth = container.clientWidth;
    if (itemWidth > 0) {
      const newIndex = Math.round(scrollPosition / itemWidth);
      if (newIndex >= 0 && newIndex < displayImages.length && newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    }
  };

  // Re-align snapped active image on container resize
  useEffect(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const handleResize = () => {
      const itemWidth = container.clientWidth;
      if (itemWidth > 0 && !isProgrammaticScroll.current) {
        container.scrollTo({
          left: activeIndex * itemWidth,
          behavior: "auto",
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  // Keyboard arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only react if gallery is in viewport / active
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Desktop click-and-drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeftRef.current = carouselRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // Drag speed multiplier
    carouselRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (!isDraggingRef.current || !carouselRef.current) return;
    isDraggingRef.current = false;
    // Snap to nearest item on mouse release
    const container = carouselRef.current;
    const scrollPosition = container.scrollLeft;
    const itemWidth = container.clientWidth;
    const nearestIndex = Math.round(scrollPosition / itemWidth);
    const clampedIndex = Math.max(0, Math.min(nearestIndex, displayImages.length - 1));
    setActiveIndex(clampedIndex);
    scrollToImage(clampedIndex);
  };

  return (
    <div
      className="space-y-3"
      role="region"
      aria-label={`${title} Image Gallery`}
      tabIndex={0}
    >
      {/* Main Carousel Stage */}
      <div 
        id="property-carousel-stage"
        className="relative aspect-[16/10] sm:aspect-[16/9] w-full max-h-[520px] rounded-2xl overflow-hidden bg-stone-900 border border-stone-200/80 shadow-md group focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {/* Horizontal scroll snapping container */}
        <div
          id="property-carousel-container"
          ref={carouselRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex h-full w-full overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing select-none scrollbar-none snap-x snap-mandatory"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {displayImages.map((src, idx) => (
            <div
              key={idx}
              id={`property-slide-${idx}`}
              className="flex-shrink-0 w-full min-w-full h-full relative snap-center snap-always overflow-hidden flex items-center justify-center bg-stone-950"
              style={{ 
                scrollSnapAlign: "center", 
                scrollSnapStop: "always" 
              }}
            >
              <img
                src={src}
                alt={`${title} - photo ${idx + 1} of ${displayImages.length}`}
                className="w-full h-full object-cover block pointer-events-none select-none"
                referrerPolicy="no-referrer"
                loading={idx === 0 ? "eager" : "lazy"}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImage;
                }}
              />
            </div>
          ))}
        </div>

        {/* Counter Overlay (e.g. '1/5') */}
        <div 
          id="property-carousel-counter"
          className="absolute top-3.5 right-3.5 z-20 bg-stone-900/80 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow border border-white/15 tabular-nums pointer-events-none select-none tracking-wide"
        >
          {activeIndex + 1}/{displayImages.length}
        </div>

        {/* Navigation Arrows for Desktop & Tap */}
        {displayImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous image"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-all duration-200 shadow-md border border-white/10 hover:scale-105 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-all duration-200 shadow-md border border-white/10 hover:scale-105 active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dot Index Indicators */}
            <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center items-center space-x-1.5 pointer-events-auto">
              <div className="flex items-center space-x-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {displayImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDot(idx)}
                    aria-label={`Go to photo ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === activeIndex
                        ? "w-6 bg-emerald-400 shadow-sm"
                        : "w-2 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Bar (for rapid jumping across multiple photos) */}
      {displayImages.length > 1 && (
        <div
          className="flex space-x-2 overflow-x-auto py-1 scrollbar-none"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {displayImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDot(idx)}
              className={`relative flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                idx === activeIndex
                  ? "border-[#1E6B4A] ring-2 ring-[#1E6B4A]/30 scale-100 shadow-sm"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={imgUrl}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImage;
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
