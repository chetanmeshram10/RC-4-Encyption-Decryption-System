"use client";

import { useEffect, useState } from "react";

/* =======================
   RC4 WASM MODULE TYPES
   ======================= */
interface RC4Module {
  _rc4_process: (
    inputPtr: number,
    inputLen: number,
    keyPtr: number,
    keyLen: number
  ) => number;

  _allocate_memory: (size: number) => number;
  _free_memory: (ptr: number) => void;

  HEAPU8: Uint8Array;
}

/* =======================
   PAGE COMPONENT
   ======================= */
export default function Home() {
  const [module, setModule] = useState<RC4Module | null>(null);
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================
     LOAD WASM MODULE
     ======================= */
  useEffect(() => {
    const loadWasm = async () => {
      try {
        const createRC4Module = (await import("../lib/wasm/rc4")).default;
        const mod = await createRC4Module(); // wasm auto-loads from public/
        setModule(mod);
      } catch (err) {
        console.error(err);
        setError("Failed to load WebAssembly module");
      } finally {
        setIsLoading(false);
      }
    };

    loadWasm();
  }, []);

  /* =======================
     RC4 PROCESS FUNCTION
     ======================= */
  const processRC4 = (
    inputText: string,
    keyText: string,
    encrypt: boolean
  ) => {
    if (!module) {
      setError("WebAssembly module not loaded");
      return;
    }

    if (!inputText || !keyText) {
      setError("Please provide both input and key");
      return;
    }

    try {
      setError("");
      setResult("");

      const inputBytes = encrypt
        ? new TextEncoder().encode(inputText)
        : hexToBytes(inputText);

      const keyBytes = new TextEncoder().encode(keyText);

      const inputPtr = module._allocate_memory(inputBytes.length);
      const keyPtr = module._allocate_memory(keyBytes.length);

      module.HEAPU8.set(inputBytes, inputPtr);
      module.HEAPU8.set(keyBytes, keyPtr);

      const resultPtr = module._rc4_process(
        inputPtr,
        inputBytes.length,
        keyPtr,
        keyBytes.length
      );

      const output = new Uint8Array(inputBytes.length);
      output.set(module.HEAPU8.subarray(resultPtr, resultPtr + output.length));

      module._free_memory(inputPtr);
      module._free_memory(keyPtr);
      module._free_memory(resultPtr);

      setResult(
        encrypt ? bytesToHex(output) : new TextDecoder().decode(output)
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /* =======================
     HELPERS
     ======================= */
  const bytesToHex = (bytes: Uint8Array): string =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const hexToBytes = (hex: string): Uint8Array => {
    const cleanHex = hex.trim().toLowerCase();

    if (cleanHex.length === 0) {
      throw new Error("Hex input is empty");
    }

    if (cleanHex.length % 2 !== 0) {
      throw new Error("Hex input length must be even");
    }

    if (!/^[0-9a-f]+$/.test(cleanHex)) {
      throw new Error("Hex input contains invalid characters");
    }

    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return bytes;
  };

  /* =======================
     UI
     ======================= */
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
            RC4 Encryption System
          </h1>
          <p className="text-gray-600 text-center mb-8">
            WebAssembly-powered RC4 Cipher
          </p>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">
                Loading WebAssembly module...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                          text-gray-900 bg-white
                          focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Enter plaintext (encrypt) or hex (decrypt)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
              />

              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                          text-gray-900 bg-white
                          focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Enter secret key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />

              <div className="flex gap-4">
                <button
                  onClick={() => processRC4(input, key, true)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg"
                >
                  🔒 Encrypt
                </button>
                <button
                  onClick={() => processRC4(input, key, false)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
                >
                  🔓 Decrypt
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {result && (
                <div>
                  <p className="font-semibold mb-2">Result</p>
                  <div className="bg-gray-100 p-3 rounded-lg font-mono break-all">
                    {result}
                  </div>
                  <button
                    className="mt-2 text-indigo-600 text-sm"
                    onClick={() => navigator.clipboard.writeText(result)}
                  >
                    📋 Copy
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="text-center text-gray-600 mt-6 text-sm">
          ITC Lab Assignment – RC4 WebAssembly Implementation
        </footer>
      </div>
    </main>
  );
}
