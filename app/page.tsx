'use client';

import { useState, useEffect } from 'react';

interface RC4Module {
  _rc4_process: (input: number, inputLen: number, key: number, keyLen: number) => number;
  _allocate_memory: (size: number) => number;
  _free_memory: (ptr: number) => void;
  HEAPU8: Uint8Array;
  stringToUTF8: (str: string, ptr: number, maxBytes: number) => void;
  UTF8ToString: (ptr: number) => string;
}

export default function Home() {
  const [module, setModule] = useState<RC4Module | null>(null);
  const [input, setInput] = useState('');
  const [key, setKey] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadWasm = async () => {
      try {
        // @ts-ignore
        const createRC4Module = (await import('/rc4.js')).default;
        const mod = await createRC4Module();
        setModule(mod);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load WebAssembly module');
        setIsLoading(false);
      }
    };
    loadWasm();
  }, []);

  const processRC4 = (inputText: string, keyText: string, isEncrypt: boolean) => {
    if (!module) {
      setError('WebAssembly module not loaded');
      return;
    }

    if (!inputText || !keyText) {
      setError('Please provide both input and key');
      return;
    }

    try {
      let inputBytes: Uint8Array;
      
      if (isEncrypt) {
        inputBytes = new TextEncoder().encode(inputText);
      } else {
        inputBytes = hexToBytes(inputText);
      }

      const keyBytes = new TextEncoder().encode(keyText);
      const inputPtr = module._allocate_memory(inputBytes.length);
      const keyPtr = module._allocate_memory(keyBytes.length);

      module.HEAPU8.set(inputBytes, inputPtr);
      module.HEAPU8.set(keyBytes, keyPtr);

      const resultPtr = module._rc4_process(inputPtr, inputBytes.length, keyPtr, keyBytes.length);

      const resultBytes = new Uint8Array(inputBytes.length);
      for (let i = 0; i < inputBytes.length; i++) {
        resultBytes[i] = module.HEAPU8[resultPtr + i];
      }

      module._free_memory(inputPtr);
      module._free_memory(keyPtr);
      module._free_memory(resultPtr);

      if (isEncrypt) {
        setResult(bytesToHex(resultBytes));
      } else {
        setResult(new TextDecoder().decode(resultBytes));
      }
      
      setError('');
    } catch (err) {
      setError('Processing failed: ' + (err as Error).message);
    }
  };

  const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
            RC4 Encryption System
          </h1>
          <p className="text-gray-600 text-center mb-8">
            WebAssembly-powered RC4 cipher
          </p>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading WebAssembly module...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input Text / Ciphertext (hex for decryption)
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter text to encrypt or hex to decrypt..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Encryption Key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Enter your secret key..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => processRC4(input, key, true)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                >
                  🔒 Encrypt
                </button>
                <button
                  onClick={() => processRC4(input, key, false)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                >
                  🔓 Decrypt
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {result && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Result
                  </label>
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                    <p className="font-mono text-sm break-all">{result}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result);
                      alert('Copied to clipboard!');
                    }}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    📋 Copy to clipboard
                  </button>
                </div>
              )}

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">How to use:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Encrypt:</strong> Enter plain text and key, click Encrypt (result in hex)</li>
                  <li>• <strong>Decrypt:</strong> Paste hex ciphertext and same key, click Decrypt</li>
                  <li>• RC4 is symmetric: same key for encryption and decryption</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <footer className="text-center mt-8 text-gray-600 text-sm">
          <p>ITC Lab Assignment 4 - RC4 WebAssembly Implementation</p>
        </footer>
      </div>
    </main>
  );
}