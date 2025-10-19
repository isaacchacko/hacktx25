'use client';

import { useEffect } from 'react';

export default function ClientPolyfills() {
  useEffect(() => {
    // Import polyfills only on client side
    import('../utils/domPolyfills');
  }, []);

  return null; // This component doesn't render anything
}
