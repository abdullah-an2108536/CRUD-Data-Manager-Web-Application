"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mountain, LogOut, User, Shield } from "lucide-react"
import { useAuth } from "./auth-provider"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const pathname = usePathname()
  const { user, isAdmin, signOut } = useAuth()

  // Don't show navbar on login page
  if (pathname === "/login") {
    return null
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href={isAdmin ? "/admin" : "/insert"} className="flex items-center space-x-2">
              <Mountain className="h-8 w-8 text-gray-700" />
              <span className="text-xl font-semibold text-gray-900">Snow Leopard Foundation</span>
            </Link>

            <div className="flex space-x-1">
              {!isAdmin && (
                <>
                  <Link
                    href="/insert"
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === "/insert"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Insert Data
                  </Link>
                  <Link
                    href="/view"
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === "/view"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    View Data
                  </Link>
                </>
              )}

              {isAdmin && (
                <>
                  <Link
                    href="/admin"
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === "/admin"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </div>
                  </Link>
                  <Link
                    href="/view"
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === "/view"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    View Data
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {isAdmin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  <span>{isAdmin ? "Administrator" : `ID: ${user.email?.split("@")[0]}`}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-600 hover:text-gray-900">
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
