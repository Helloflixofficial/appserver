import { Readable, Writable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep the existing mobile API implementation working on Vercel for paths that
// do not yet have a dedicated Next.js Route Handler. Specific app/api routes
// take precedence over this catch-all.
const { handleNodeRequest } = require("../../../server.js") as {
  handleNodeRequest: (req: NodeRequest, res: CapturedResponse) => Promise<void>;
};

const MAX_BODY_BYTES = 1024 * 1024;

type NodeRequest = Readable & {
  headers: Record<string, string>;
  method: string;
  url: string;
  resume: () => NodeRequest;
};

class CapturedResponse extends Writable {
  statusCode = 200;
  headersSent = false;
  headers: Record<string, string> = {};
  private chunks: Buffer[] = [];

  setHeader(name: string, value: string | number | readonly string[]) {
    this.headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
    return this;
  }

  getHeader(name: string) {
    return this.headers[name.toLowerCase()];
  }

  writeHead(statusCode: number, headers: Record<string, string | number> = {}) {
    this.statusCode = statusCode;
    for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
    this.headersSent = true;
    return this;
  }

  _write(chunk: Buffer | string, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  body() {
    return Buffer.concat(this.chunks);
  }
}

async function dispatch(request: Request) {
  const method = request.method.toUpperCase();
  let body: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  if (method !== "GET" && method !== "HEAD" && request.body) {
    body = new Uint8Array(await request.arrayBuffer());
    if (body.byteLength > MAX_BODY_BYTES) {
      return Response.json({ error: "Request body is too large" }, { status: 413 });
    }
  }

  const headers = Object.fromEntries(request.headers.entries());
  if (body.length && !headers["content-length"]) headers["content-length"] = String(body.length);
  const nodeRequest = Readable.from(body.byteLength ? [Buffer.from(body)] : []) as NodeRequest;
  nodeRequest.headers = headers;
  nodeRequest.method = method;
  nodeRequest.url = request.url;
  nodeRequest.resume = () => {
    Readable.prototype.resume.call(nodeRequest);
    return nodeRequest;
  };

  const response = new CapturedResponse();
  const finished = new Promise<void>((resolve, reject) => {
    response.once("finish", resolve);
    response.once("error", reject);
  });
  await handleNodeRequest(nodeRequest, response);
  if (!response.writableEnded) await finished;

  const status = response.statusCode;
  const responseBody = method === "HEAD" || status === 204 || status === 304 ? null : new Uint8Array(response.body());
  return new Response(responseBody, { status, headers: response.headers });
}

export const GET = dispatch;
export const HEAD = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;