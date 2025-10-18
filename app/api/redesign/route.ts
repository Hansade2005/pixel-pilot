import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    console.log('🌐 Fetching URL content from Jina AI:', url)

    const response = await fetch(
      `https://r.jina.ai/${encodeURIComponent(url)}`,
      {
        method: "POST",
      }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL content" },
        { status: 500 }
      );
    }
    
    // Jina AI returns markdown content directly (works for most sites like BBC)
    // Some sites like example.com may return JSON, but text() handles both
    const markdown = await response.text();
    
    console.log('✅ Jina AI response received:', {
      contentLength: markdown.length,
      preview: markdown.substring(0, 100)
    })
    
    return NextResponse.json(
      {
        ok: true,
        markdown,
      },
      { status: 200 }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("❌ Error fetching URL:", error)
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}
