/**
 * Step 1 of the upload wizard — file selection and parser choice.
 * Handles drag-and-drop CSV upload and posts to /api/uploads.
 */

"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { ParsedUploadResult } from "./types";

interface Props {
  onSuccess: (result: ParsedUploadResult, file: File) => void;
}

export default function StepFilePicker({ onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parser, setParser] = useState("travelspend");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setErrors([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setErrors([]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("parser", parser);

    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors([data.error ?? data.message ?? "Upload failed"]);
        return;
      }

      if (data.errors?.length) {
        setErrors(data.errors.map((e: { message: string }) => e.message));
      }

      onSuccess(data, file);
    } catch {
      setErrors(["An unexpected error occurred. Please try again."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Upload your CSV
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Select a CSV file exported from your spending app to get started.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parser
          </label>
          <select
            value={parser}
            onChange={(e) => setParser(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="travelspend">TravelSpend</option>
            <option value="wealthsimple">Wealthsimple Visa (CSV)</option>
          </select>
        </div>

        {file ? (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 flex-shrink-0 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="flex-1 truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-emerald-700 font-medium cursor-pointer underline-offset-2 hover:underline flex-shrink-0"
            >
              Change file
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-emerald-600 bg-emerald-50"
                : "border-gray-300 hover:border-emerald-600 hover:bg-emerald-50/30"
            }`}
          >
            <input {...getInputProps()} />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 mx-auto text-gray-400 mb-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Drag &amp; drop your CSV file here
            </p>
            <p className="text-xs text-gray-400 my-1">or</p>
            <span className="text-emerald-700 font-medium cursor-pointer underline-offset-2 hover:underline text-sm">
              Browse files
            </span>
          </div>
        )}

        {errors.length > 0 && (
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-sm text-red-600">
                {err}
              </li>
            ))}
          </ul>
        )}

        <button
          type="submit"
          disabled={!file || loading}
          className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Uploading…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
