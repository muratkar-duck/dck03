import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    console.info('Interest received:', payload);

    return NextResponse.json({ status: 'queued' }, { status: 200 });
  } catch (error) {
    console.error('Interest payload işlenemedi:', error);
    return NextResponse.json(
      { error: 'Geçersiz istek payload\'ı.' },
      { status: 400 }
    );
  }
}
