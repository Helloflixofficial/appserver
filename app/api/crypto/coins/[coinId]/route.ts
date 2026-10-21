import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_ROOT = "https://api.coingecko.com/api/v3";
type Context = { params: { coinId: string } };

export async function GET(_request: Request, { params }: Context) {
  const coinId = params.coinId;
  if (!/^[a-z0-9-]{1,80}$/i.test(coinId)) {
    return NextResponse.json({ error: "Invalid coin ID." }, { status: 400 });
  }
  const key = process.env.COINGECKO_DEMO_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "CoinGecko API key is not configured on the server." }, { status: 503 });
  }

  try {
    const url = new URL(API_ROOT + "/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", coinId);
    url.searchParams.set("sparkline", "false");
    url.searchParams.set("price_change_percentage", "1h,24h,7d");
    const response = await fetch(url, {
      headers: { "x-cg-demo-api-key": key, accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 429 ? "CoinGecko rate limit reached. Try again shortly." : "Coin details are temporarily unavailable." },
        { status: response.status === 429 ? 429 : response.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    console.error("[CRYPTO_COIN_DETAILS]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Coin details are temporarily unavailable." }, { status: 502 });
  }
}
