import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_ROOT = "https://api.coingecko.com/api/v3";
const PAGE_SIZE = 250;

async function fetchCoinGecko(path: string) {
  const key = process.env.COINGECKO_DEMO_API_KEY;
  if (!key) return { ok: false as const, status: 503, data: null };
  const response = await fetch(API_ROOT + path, {
    headers: { "x-cg-demo-api-key": key, accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!response.ok) return { ok: false as const, status: response.status, data: null };
  return { ok: true as const, status: 200, data: await response.json() };
}

function marketPath(page: number) {
  return "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=" +
    PAGE_SIZE +
    "&page=" +
    page +
    "&sparkline=true&price_change_percentage=1h%2C24h%2C7d";
}

export async function GET(request: NextRequest) {
  const parsedPage = Number(request.nextUrl.searchParams.get("page") ?? "1");
  if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > 1000) {
    return NextResponse.json({ error: "Page must be between 1 and 1000." }, { status: 400 });
  }

  try {
    const markets = await fetchCoinGecko(marketPath(parsedPage));
    if (!markets.ok) {
      return NextResponse.json(
        { error: markets.status === 503 && !process.env.COINGECKO_DEMO_API_KEY ? "CoinGecko API key is not configured on the server." : "CoinGecko market data is temporarily unavailable." },
        { status: markets.status === 429 ? 429 : markets.status === 503 ? 503 : 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const marketRows = Array.isArray(markets.data) ? markets.data : [];
    if (parsedPage > 1) {
      return NextResponse.json(
        { markets: marketRows, page: parsedPage, hasMore: marketRows.length === PAGE_SIZE, updatedAt: new Date().toISOString() },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
      );
    }

    const [global, trending] = await Promise.all([
      fetchCoinGecko("/global"),
      fetchCoinGecko("/search/trending"),
    ]);
    if (!global.ok || !trending.ok) {
      const upstreamStatus = [global, trending].find((result) => !result.ok)?.status ?? 502;
      return NextResponse.json(
        { error: upstreamStatus === 503 && !process.env.COINGECKO_DEMO_API_KEY ? "CoinGecko API key is not configured on the server." : "CoinGecko market data is temporarily unavailable." },
        { status: upstreamStatus === 429 ? 429 : upstreamStatus === 503 ? 503 : 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        global: (global.data as any)?.data ?? null,
        markets: marketRows,
        trending: ((trending.data as any)?.coins ?? []).map((item: any) => item.item),
        page: parsedPage,
        hasMore: marketRows.length === PAGE_SIZE,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error("[CRYPTO_MARKETS]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "CoinGecko market data is temporarily unavailable." }, { status: 502 });
  }
}
