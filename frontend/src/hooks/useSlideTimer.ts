'use client';

import { useState, useEffect, useRef } from 'react';

export const useSlideTimer = (totalPages: number) => {
  const [slideTimings, setSlideTimings] = useState<number[]>(new Array(totalPages).fill(0));
  const [currentSlideStartTime, setCurrentSlideStartTime] = useState<number>(Date.now());
  const [estimatedTotalTime, setEstimatedTotalTime] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update time spent on current slide
  const updateSlideTime = (slideIndex: number, additionalTime: number) => {
    setSlideTimings(prev => {
      const newTimings = [...prev];
      newTimings[slideIndex] = (newTimings[slideIndex] || 0) + additionalTime;
      return newTimings;
    });
  };

  // Calculate estimated total time
  const calculateEstimatedTime = (currentSlide: number, timings: number[]) => {
    // Calculate average time per slide (for slides that have been viewed)
    const viewedSlides = timings.filter(time => time > 0);
    const averageTime = viewedSlides.length > 0 
      ? viewedSlides.reduce((sum, time) => sum + time, 0) / viewedSlides.length 
      : 0;

    // Time already spent
    const timeSpent = timings.reduce((sum, time) => sum + time, 0);
    
    // Remaining slides
    const remainingSlides = totalPages - currentSlide;
    
    // Estimated time = time spent + (average time * remaining slides)
    const estimated = timeSpent + (averageTime * remainingSlides);
    
    return Math.round(estimated / 1000); // Return in seconds
  };

  // Reset timer for a specific slide
  const resetSlideTimer = () => {
    setCurrentSlideStartTime(Date.now());
  };

  // Handle slide change
  const onSlideChange = (newSlideIndex: number) => {
    const now = Date.now();
    const timeSpent = now - currentSlideStartTime;
    
    // Update the time for the slide we're leaving
    updateSlideTime(newSlideIndex - 1, timeSpent);
    
    // Reset timer for new slide
    setCurrentSlideStartTime(now);
    
    // Calculate new estimated time
    const newEstimate = calculateEstimatedTime(newSlideIndex, slideTimings);
    setEstimatedTotalTime(newEstimate);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    slideTimings,
    estimatedTotalTime,
    onSlideChange,
    resetSlideTimer,
    formatTime,
  };
};
