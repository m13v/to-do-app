'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function OpenInBrowser() {
  const [targetUrl, setTargetUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    // This captures the URL the user was trying to access
    const url = new URL(window.location.href);
    // We remove our special path and tell it to go to the root
    // Clerk will then handle the redirect to the correct sign-in page
    url.pathname = '/';
    setTargetUrl(url.toString());
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl).then(() => {
      setIsCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    }, (err) => {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy link.');
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Please Open in Your Browser</h1>
        <p className="text-gray-600 mb-6">
          It looks like you&apos;re in a webview, which can cause issues with signing in. For your security, please continue in your phone&apos;s default browser.
        </p>
        
        <div className="flex items-center space-x-2 p-2 bg-white border rounded-lg shadow-sm">
          <input
            type="text"
            value={targetUrl}
            readOnly
            className="flex-1 p-2 bg-transparent outline-none text-sm text-gray-700 truncate"
          />
          <Button onClick={handleCopy} size="icon" variant="ghost">
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          This helps protect your account from unauthorized access.
        </p>
      </div>
    </div>
  );
} 