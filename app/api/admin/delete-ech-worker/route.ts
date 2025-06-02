import { type NextRequest, NextResponse } from "next/server"
import { deleteEchWorkerWithAuth } from "@/lib/auth"

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { echId } = body

    if (!echId) {
      return NextResponse.json({ error: "ECH ID is required" }, { status: 400 })
    }

    await deleteEchWorkerWithAuth(echId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in delete-ech-worker API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete ECH worker" },
      { status: 500 },
    )
  }
}
