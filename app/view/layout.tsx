import type React from "react"
import ProtectedRoute from "@/components/protected-route"

export default function ViewLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
