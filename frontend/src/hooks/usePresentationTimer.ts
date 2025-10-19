'use client';

import { useState, useEffect, useRef } from 'react';

export const usePresentationTimer = (totalPages: number, currentPage: number) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [slideTimings, setSlideTimings] = useState<number[]>(new Array(totalPages).fill(0));
  const [currentSlideStartTime, setCurrentSlideStartTime] = useState<number | null>(null);
  const [estimatedTotalTime, setEstimatedTotalTime] = useState<number>(0);
  const [totalRecordingTime, setTotalRecordingTime] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Start recording timer
  const startRecording = () => {
    const now = Date.now();
    setIsRecording(true);
    setRecordingStartTime(now);
    recordingStartTimeRef.current = now;
    setCurrentSlideStartTime(now);
    
    // Start interval to update total recording time
    intervalRef.current = setInterval(() => {
      if (recordingStartTimeRef.current) {
        setTotalRecordingTime(Date.now() - recordingStartTimeRef.current);
      }
    }, 1000);
  };

  // Stop recording timer
  const stopRecording = () => {
    setIsRecording(false);
    recordingStartTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Finalize current slide timing
    if (currentSlideStartTime && currentPage) {
      const timeSpent = Date.now() - currentSlideStartTime;
      updateSlideTime(currentPage - 1, timeSpent);
    }
  };

  // Update time spent on current slide
  const updateSlideTime = (slideIndex: number, additionalTime: number) => {
    setSlideTimings(prev => {
      const newTimings = [...prev];
      newTimings[slideIndex] = (newTimings[slideIndex] || 0) + additionalTime;
      return newTimings;
    });
  };

  // Handle slide change during recording
  const onSlideChange = (newSlideIndex: number) => {
    if (!isRecording) return;
    
    const now = Date.now();
    
    // Update the time for the slide we're leaving
    if (currentSlideStartTime && currentPage) {
      const timeSpent = now - currentSlideStartTime;
      updateSlideTime(currentPage - 1, timeSpent);
    }
    
    // Reset timer for new slide
    setCurrentSlideStartTime(now);
    
    // Calculate new estimated time
    const newEstimate = calculateEstimatedTime(newSlideIndex, slideTimings);
    setEstimatedTotalTime(newEstimate);
  };

  // Calculate estimated total time based on recording progress
  const calculateEstimatedTime = (currentSlide: number, timings: number[]) => {
    if (!isRecording || !recordingStartTime) return 0;
    
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

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset all timers
  const resetTimer = () => {
    setIsRecording(false);
    setRecordingStartTime(null);
    recordingStartTimeRef.current = null;
    setCurrentSlideStartTime(null);
    setTotalRecordingTime(0);
    setSlideTimings(new Array(totalPages).fill(0));
    setEstimatedTotalTime(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
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
    isRecording,
    totalRecordingTime,
    slideTimings,
    estimatedTotalTime,
    startRecording,
    stopRecording,
    onSlideChange,
    resetTimer,
    formatTime,
  };
};
