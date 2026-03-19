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
        setErrors([data.message ?? "Upload failed"]);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Parser
        </label>
        <select
          value={parser}
          onChange={(e) => setParser(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="travelspend">TravelSpend</option>
        </select>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <p className="text-sm text-gray-700">
            <span className="font-medium">{file.name}</span>{" "}
            <span className="text-gray-500">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </p>
        ) : isDragActive ? (
          <p className="text-sm text-blue-600">Drop the CSV file here…</p>
        ) : (
          <p className="text-sm text-gray-500">
            Drag and drop a CSV file here, or click to select
          </p>
        )}
      </div>

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
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Uploading…" : "Continue"}
      </button>
    </form>
  );
}
