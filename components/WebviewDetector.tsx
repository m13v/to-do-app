'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const WebviewDetector = () => {
  const [isWebview, setIsWebview] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // This detection logic runs only on the client-side
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for common webview indicators in the user agent string
    const isAndroidWebView = userAgent.includes('wv');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isIOSWebView = isIOS && !userAgent.includes('safari');
    
    // Also check if the user is on the sign-in page
    const isOnSignInPage = window.location.hostname === 'accounts.todoapp.ai';

    if ((isAndroidWebView || isIOSWebView) && isOnSignInPage) {
      setIsWebview(true);
    }
    
    setCurrentUrl(window.location.href);

  }, []);

  if (!isWebview) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <a href={currentUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <Button variant="outline" className="bg-background shadow-lg">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in Browser
        </Button>
      </a>
    </div>
  );
};

export default WebviewDetector; 