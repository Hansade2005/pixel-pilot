// ==========================================================
// E2B SANDBOX TOOL — MULTI-DOCUMENT + PNG + PDF SUPPORT
// ==========================================================
// Purpose: Execute Python code in a secure sandbox and return 
// signed download URLs for all generated files (PDF, DOCX, PNG, CSV, etc.)
// ==========================================================

import { Sandbox } from "@e2b/code-interpreter";
import { NextRequest, NextResponse } from "next/server";

const sandboxTimeout = 5 * 60 * 1000; // 5 minutes
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // --------------------------
    // EXTRACT PYTHON CODE
    // --------------------------
    const formData = await req.formData();
    const code = formData.get("code") as string;

    if (!code) {
      return NextResponse.json(
        { error: "No Python code provided" },
        { status: 400 }
      );
    }

    // --------------------------
    // VALIDATE E2B API KEY
    // --------------------------
    if (!process.env.E2B_API_KEY) {
      return NextResponse.json(
        { error: "E2B_API_KEY environment variable not configured" },
        { status: 500 }
      );
    }

    // --------------------------
    // CREATE SANDBOX SESSION
    // --------------------------
    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: sandboxTimeout,
    });

    try {
      // --------------------------
      // RUN PYTHON CODE
      // --------------------------
      const result = await sandbox.runCode(code);

      // --------------------------
      // LIST ALL GENERATED FILES
      // --------------------------
      const files = await sandbox.files.list("/");

      // --------------------------
      // GENERATE DOWNLOAD URLS
      // --------------------------
      const downloads: Record<string, string> = {};

      for (const file of files) {
        if (file.type === "file") {
          const url = await sandbox.downloadUrl(file.path, {
            useSignatureExpiration: 10_000, // 10-second signed link
          });
          downloads[file.path] = url;
        }
      }

      // --------------------------
      // RETURN RESULTS + DOWNLOADS
      // --------------------------
      return NextResponse.json({
        success: true,
        text: result.text,
        logs: result.logs,
        error: result.error,
        results: result.results,
        downloads, // includes chart.png, report.pdf, report.docx, etc.
      });
    } finally {
      // --------------------------
      // CLEANUP: KILL SANDBOX
      // --------------------------
      await sandbox.kill();
    }
  } catch (error) {
    console.error("E2B Sandbox Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
