import { NextResponse } from 'next/server';
import { processQuery } from '@/actions/ai';

export async function GET() {
    try {
        const response = await processQuery("Go to inventory", "Sai Associates");
        return NextResponse.json({ success: true, response });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
