import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const vendors = await prisma.vendor.findMany({
      where: search ? { name: { contains: search } } : {},
      include: { _count: { select: { invoices: true } } },
      orderBy: { totalSpend: 'desc' },
      take: 100,
    })
    return NextResponse.json(vendors)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
  }
}
