import React, { forwardRef } from 'react';
import HTMLFlipBook from "react-pageflip";
import { cn } from "@/lib/utils";

interface PageProps {
  children: React.ReactNode;
  className?: string;
}

export const Page = forwardRef<HTMLDivElement, PageProps>(({ children, className }, ref) => {
  return (
    <div 
      ref={ref} 
      className={cn(
        "bg-[#f5e6d3] p-6 shadow-lg overflow-hidden",
        "bg-[linear-gradient(to_right,rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)]",
        "bg-[size:20px_25px]",
        className
      )}
    >
      <div className="h-full overflow-hidden font-crimson text-[#2a1810]">
        {children}
      </div>
    </div>
  );
});

Page.displayName = "Page";

interface BookSliderProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  className?: string;
}

const BookSlider = forwardRef<any, BookSliderProps>(({ 
  children, 
  width = 400, 
  height = 500,
  className 
}, ref) => {
  return (
    <div className={cn("flex justify-center items-center", className)}>
      <HTMLFlipBook
        ref={ref}
        width={width}
        height={height}
        size="stretch"
        minWidth={300}
        maxWidth={600}
        minHeight={400}
        maxHeight={700}
        showCover={true}
        mobileScrollSupport={true}
        className="shadow-2xl"
        style={{}}
        startPage={0}
        drawShadow={true}
        flippingTime={800}
        usePortrait={true}
        startZIndex={0}
        autoSize={true}
        maxShadowOpacity={0.5}
        showPageCorners={true}
        disableFlipByClick={false}
        swipeDistance={30}
        clickEventForward={true}
        useMouseEvents={true}
      >
        {children}
      </HTMLFlipBook>
    </div>
  );
});

BookSlider.displayName = "BookSlider";

export default BookSlider;
