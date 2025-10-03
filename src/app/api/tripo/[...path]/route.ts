import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const TRIPO_BASE = 'https://api.tripo3d.ai';

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ path: string[] }> }
) {
    const { path } = await ctx.params;
    const target = `${TRIPO_BASE}/${path.join('/')}${req.nextUrl.search}`;
    const res = await fetch(target, {
        headers: forwardHeaders(req.headers),
        cache: 'no-store',
    });
    return relay(res);
}

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ path: string[] }> }
) {
    const { path } = await ctx.params;
    const target = `${TRIPO_BASE}/${path.join('/')}${req.nextUrl.search}`;
    const res = await fetch(target, {
        method: 'POST',
        headers: forwardHeaders(req.headers),
        body: req.body,
        cache: 'no-store',
    });
    return relay(res);
}

function forwardHeaders(h: Headers): HeadersInit {
    const headers = new Headers(h);
    headers.delete('host');
    headers.delete('content-length');
    headers.delete('connection');
    headers.delete('accept-encoding');
    return headers;
}

function relay(res: Response) {
    const headers = new Headers(res.headers);
    return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
    });
}
