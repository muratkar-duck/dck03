import { NextResponse } from 'next/server';

const METHOD_NOT_ALLOWED = NextResponse.json(
  { error: 'Method Not Allowed' },
  {
    status: 405,
    headers: { Allow: 'GET' },
  },
);

export async function GET() {
  return NextResponse.json({ messages: [] });
}

export async function POST() {
  return METHOD_NOT_ALLOWED;
}

export async function PUT() {
  return METHOD_NOT_ALLOWED;
}

export async function PATCH() {
  return METHOD_NOT_ALLOWED;
}

export async function DELETE() {
  return METHOD_NOT_ALLOWED;
}

export async function HEAD() {
  return METHOD_NOT_ALLOWED;
}
