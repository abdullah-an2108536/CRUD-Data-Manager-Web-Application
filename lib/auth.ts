import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the entire server-side application
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Function to get ECH worker details by email
export async function getEchWorkerByEmail(email: string) {
  const echId = email.split("@")[0]

  const { data, error } = await supabaseAdmin.from("ech_worker").select("*").eq("echid", echId).single()

  if (error) {
    console.error("Error fetching ECH worker:", error)
    return null
  }

  return data
}

// Function to verify if a user is an ECH worker
export async function isValidEchWorker(email: string) {
  const echWorker = await getEchWorkerByEmail(email)
  return !!echWorker
}

// Function to check if user is admin
export function isAdmin(email: string) {
  return email === "admin@slf.com"
}

// Function to get villages assigned to an ECH worker
export async function getEchWorkerVillages(echId: number) {
  const { data, error } = await supabaseAdmin
    .from("ech_worker_village")
    .select(`
    villageid,
    assignmentstart,
    assignmentend,
    village:villageid(
      villageid,
      villagename,
      cname,
      population,
      area,
      gpslat,
      gpslong
    )
  `)
    .eq("echid", echId)
    .is("assignmentend", null) // Only active assignments

  if (error) {
    console.error("Error fetching ECH worker villages:", error)
    return []
  }

  return data?.map((item) => item.village).filter(Boolean) || []
}

// Function to check if ECH worker can access a specific village
export async function canEchWorkerAccessVillage(echId: number, villageId: number) {
  const { data, error } = await supabaseAdmin
    .from("ech_worker_village")
    .select("echid")
    .eq("echid", echId)
    .eq("villageid", villageId)
    .is("assignmentend", null) // Only active assignments
    .single()

  if (error) {
    return false
  }

  return !!data
}

// Function to create a new ECH worker with Supabase auth account
export async function createEchWorkerWithAuth(workerData: {
  name: string
  fathername?: string
  nationalid: string
  joiningdate: string
  highesteducation?: string
  phonenumber?: string
  address?: string
  trainings?: Array<{
    trainingid: number
    completiondate: string
  }>
}) {
  try {
    // Extract trainings from worker data to avoid insertion error
    const { trainings, ...workerDataWithoutTrainings } = workerData

    // First, get the next available ECH ID
    const { data: maxEchData, error: maxError } = await supabaseAdmin
      .from("ech_worker")
      .select("echid")
      .order("echid", { ascending: false })
      .limit(1)

    if (maxError) throw maxError

    const nextEchId = (maxEchData?.[0]?.echid || 0) + 1
    const username = `ech_${nextEchId}`

    // Create ECH worker record
    const { data: echWorker, error: echError } = await supabaseAdmin
      .from("ech_worker")
      .insert([
        {
          echid: nextEchId,
          username,
          passwordhash: "temp_hash", // Will be updated when auth user is created
          ...workerDataWithoutTrainings,
        },
      ])
      .select()
      .single()

    if (echError) throw echError

    // Create Supabase auth user
    const email = `${nextEchId}@slf.com`
    const password = "slf@2023"

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      // If auth creation fails, delete the ECH worker record
      await supabaseAdmin.from("ech_worker").delete().eq("echid", nextEchId)
      throw authError
    }

    // Add training records if provided
    if (trainings && trainings.length > 0) {
      const trainingRecords = trainings.map((training) => ({
        echid: nextEchId,
        trainingid: training.trainingid,
        completiondate: training.completiondate,
      }))

      const { error: trainingError } = await supabaseAdmin.from("ech_worker_training").insert(trainingRecords)

      if (trainingError) {
        console.error("Error adding training records:", trainingError)
        // Don't fail the entire operation for training errors
      }
    }

    return { echWorker, authUser, email, password }
  } catch (error) {
    console.error("Error creating ECH worker with auth:", error)
    throw error
  }
}

// Function to delete ECH worker and associated auth user
export async function deleteEchWorkerWithAuth(echId: number) {
  try {
    const email = `${echId}@slf.com`

    // Get the auth user ID
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
    if (getUserError) throw getUserError

    const authUser = users.users.find((user) => user.email === email)

    // Delete ECH worker record (this will cascade to related tables)
    const { error: deleteEchError } = await supabaseAdmin.from("ech_worker").delete().eq("echid", echId)

    if (deleteEchError) throw deleteEchError

    // Delete auth user if exists
    if (authUser) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError)
        // Don't throw here as ECH worker is already deleted
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting ECH worker with auth:", error)
    throw error
  }
}

// Function to assign village to ECH worker
export async function assignVillageToEchWorker(echId: number, villageId: number, startDate: string) {
  const { data, error } = await supabaseAdmin
    .from("ech_worker_village")
    .insert([
      {
        echid: echId,
        villageid: villageId,
        assignmentstart: startDate,
      },
    ])
    .select()

  if (error) {
    console.error("Error assigning village to ECH worker:", error)
    throw error
  }

  return data
}

// Function to end village assignment
export async function endVillageAssignment(echId: number, villageId: number, endDate: string) {
  const { error } = await supabaseAdmin
    .from("ech_worker_village")
    .update({ assignmentend: endDate })
    .eq("echid", echId)
    .eq("villageid", villageId)
    .is("assignmentend", null)

  if (error) {
    console.error("Error ending village assignment:", error)
    throw error
  }

  return { success: true }
}

// Function to get all trainings
export async function getAllTrainings() {
  const { data, error } = await supabaseAdmin.from("training").select("*").order("trainingname")

  if (error) {
    console.error("Error fetching trainings:", error)
    return []
  }

  return data || []
}

// Function to create a new training
export async function createTraining(trainingData: {
  trainingname: string
  yearcompleted: number
  durationdays: number
  scope?: string
  conductedby?: string
}) {
  const { data, error } = await supabaseAdmin.from("training").insert([trainingData]).select().single()

  if (error) {
    console.error("Error creating training:", error)
    throw error
  }

  return data
}

// Function to assign training to ECH worker
export async function assignTrainingToWorker(echId: number, trainingId: number, completionDate: string) {
  const { data, error } = await supabaseAdmin
    .from("ech_worker_training")
    .insert([
      {
        echid: echId,
        trainingid: trainingId,
        completiondate: completionDate,
      },
    ])
    .select()

  if (error) {
    console.error("Error assigning training to worker:", error)
    throw error
  }

  return data
}

// Function to remove training from ECH worker
export async function removeTrainingFromWorker(echId: number, trainingId: number) {
  const { error } = await supabaseAdmin
    .from("ech_worker_training")
    .delete()
    .eq("echid", echId)
    .eq("trainingid", trainingId)

  if (error) {
    console.error("Error removing training from worker:", error)
    throw error
  }

  return { success: true }
}
