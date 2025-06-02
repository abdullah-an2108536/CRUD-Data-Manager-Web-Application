"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useAuth } from "@/components/auth-provider"

export function useEchWorkerVillages() {
  const { user } = useAuth()
  const [villages, setVillages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()

  useEffect(() => {
    const fetchVillages = async () => {
      if (!user?.email) {
        setVillages([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const echId = user.email.split("@")[0]

        // Fetch villages assigned to this ECH worker
        const { data, error: fetchError } = await supabase
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
          .eq("echid", Number.parseInt(echId))
          .is("assignmentend", null) // Only active assignments (no end date)

        if (fetchError) {
          throw fetchError
        }

        const assignedVillages = data?.map((item) => item.village).filter(Boolean) || []
        setVillages(assignedVillages)
      } catch (err) {
        console.error("Error fetching ECH worker villages:", err)
        setError("Failed to fetch assigned villages")
        setVillages([])
      } finally {
        setLoading(false)
      }
    }

    fetchVillages()
  }, [user, supabase])

  const canAccessVillage = (villageId: number) => {
    return villages.some((village) => village.villageid === villageId)
  }

  const getVillagesByCommunity = (communityName: string) => {
    return villages.filter((village) => village.cname === communityName)
  }

  return {
    villages,
    loading,
    error,
    canAccessVillage,
    getVillagesByCommunity,
  }
}
