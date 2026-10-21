import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.COINGECKO_DEMO_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "CoinGecko API key is not configured on the server." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/categories?order=market_cap_desc",
      {
        headers: { "x-cg-demo-api-key": key, accept: "application/json" },
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "CoinGecko category data is temporarily unavailable." },
        {
          status: response.status === 429 ? 429 : 502,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const categories = await response.json();
    return NextResponse.json(Array.isArray(categories) ? categories : [], {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error(
      "[CRYPTO_CATEGORIES]",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { error: "CoinGecko category data is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
