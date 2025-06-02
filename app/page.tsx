"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        console.log("Home page: User authenticated, redirecting")
        if (user.email === "admin@slf.com") {
          router.push("/admin")
        } else {
          router.push("/insert")
        }
      } else {
        console.log("Home page: No user, redirecting to login")
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
