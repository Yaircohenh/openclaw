import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const receipt = await prisma.receipt.update({
      where: { id },
      data: {
        invoiceId: body.invoiceId,
        isManualMatch: body.isManualMatch ?? true,
        notes: body.notes,
      },
      include: { invoice: true },
    })
    return NextResponse.json(receipt)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update receipt' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.receipt.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete receipt' }, { status: 500 })
  }
}
