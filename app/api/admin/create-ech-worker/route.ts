import { type NextRequest, NextResponse } from "next/server"
import { createEchWorkerWithAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, fathername, nationalid, joiningdate, highesteducation, phonenumber, address, selectedTrainings } =
      body

    if (!name || !nationalid || !joiningdate) {
      return NextResponse.json({ error: "Name, National ID, and joining date are required" }, { status: 400 })
    }

    const result = await createEchWorkerWithAuth({
      name,
      fathername,
      nationalid,
      joiningdate,
      highesteducation,
      phonenumber,
      address,
      trainings: selectedTrainings, // Pass the trainings array correctly
    })

    return NextResponse.json({
      success: true,
      echWorker: result.echWorker,
      email: result.email,
      password: result.password,
    })
  } catch (error) {
    console.error("Error in create-ech-worker API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create ECH worker" },
      { status: 500 },
    )
  }
}
