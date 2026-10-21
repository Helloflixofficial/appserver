import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_ROOT = "https://api.coingecko.com/api/v3";
const ALLOWED_DAYS = new Set(["1", "7", "30", "90", "365"]);

type Context = { params: { coinId: string } };

export async function GET(request: NextRequest, { params }: Context) {
  const coinId = params.coinId;
  const days = request.nextUrl.searchParams.get("days") ?? "7";
  const currency = request.nextUrl.searchParams.get("vs_currency") ?? "usd";
  if (!/^[a-z0-9-]{1,80}$/i.test(coinId)) {
    return NextResponse.json({ error: "Invalid coin ID." }, { status: 400 });
  }
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json({ error: "Choose a supported chart range." }, { status: 400 });
  }
  if (currency !== "usd") {
    return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
  }

  const key = process.env.COINGECKO_DEMO_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "CoinGecko API key is not configured on the server." }, { status: 503 });
  }

  try {
    const url = new URL(API_ROOT + "/coins/" + encodeURIComponent(coinId) + "/market_chart");
    url.searchParams.set("vs_currency", currency);
    url.searchParams.set("days", days);
    const response = await fetch(url, {
      headers: { "x-cg-demo-api-key": key, accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 429 ? "CoinGecko rate limit reached. Try again shortly." : "Price history is temporarily unavailable." },
        { status: response.status === 429 ? 429 : response.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    const chart = await response.json();
    return NextResponse.json(chart, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("[CRYPTO_COIN_CHART]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Price history is temporarily unavailable." }, { status: 502 });
  }
}
