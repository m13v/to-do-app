'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function OpenInBrowser() {
  const [targetUrl, setTargetUrl] = useState('');

  useEffect(() => {
    // This captures the URL the user was trying to access
    const url = new URL(window.location.href);
    // We remove our special path and tell it to go to the root
    // Clerk will then handle the redirect to the correct sign-in page
    url.pathname = '/';
    setTargetUrl(url.toString());
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Almost there!</h1>
        <p className="text-gray-600 mb-6">
          Seems like you are opening a webview inside other app, please continue by opening this page in your phone&apos;s default browser. Click on the three dots in the top right corner, then &apos;open in browser&apos;
        </p>
        <a href={targetUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        </a>
        <p className="text-xs text-gray-400 mt-4">
          This helps protect your account from unauthorized access.
        </p>
      </div>
    </div>
  );
} 