"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mountain, AlertCircle, Shield } from "lucide-react"

export default function LoginPage() {
  const [echId, setEchId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // If user is already authenticated, redirect appropriately
  useEffect(() => {
    if (!authLoading && user) {
      console.log("User already authenticated, redirecting")
      if (user.email === "admin@slf.com") {
        router.push("/admin")
      } else {
        router.push("/insert")
      }
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      let email: string

      // Check if admin login
      if (echId.toLowerCase() === "admin") {
        email = "admin@slf.com"
      } else {
        // Validate ECH ID format (should be a number)
        if (!echId.match(/^\d+$/)) {
          setError("Please enter a valid ECH ID (numbers only) or 'admin' for admin access")
          setIsLoading(false)
          return
        }
        // Convert ECH ID to email format
        email = `${echId}@slf.com`
      }

      console.log("Submitting login for:", email)

      const { error: signInError } = await signIn(email, password)

      if (signInError) {
        console.error("Login error:", signInError)
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Invalid credentials. Please check your ECH ID and password.")
        } else {
          setError(signInError.message)
        }
      } else {
        console.log("Login successful")
        // Don't manually redirect here - let the auth provider handle it
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render login form if user is authenticated
  if (user) {
    return null
  }

  const isAdminLogin = echId.toLowerCase() === "admin"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-gray-800 text-white rounded-t-lg">
          <div className="flex items-center justify-center mb-4">
            {isAdminLogin ? <Shield className="h-12 w-12" /> : <Mountain className="h-12 w-12" />}
          </div>
          <CardTitle className="text-center text-2xl">Snow Leopard Foundation</CardTitle>
          <CardDescription className="text-center text-gray-300">
            {isAdminLogin ? "Administrator Access" : "Sign in to access the data management system"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="echId">{isAdminLogin ? "Admin Access" : "ECH Worker ID"}</Label>
              <Input
                id="echId"
                type="text"
                placeholder={isAdminLogin ? "Enter 'admin'" : "Enter your ECH ID (e.g., 1) or 'admin'"}
                value={echId}
                onChange={(e) => setEchId(e.target.value)}
                required
                className="border-gray-300 focus:border-gray-500"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                {isAdminLogin
                  ? "You are logging in as administrator"
                  : "Enter your ECH worker ID number or 'admin' for administrator access"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-gray-300 focus:border-gray-500"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full bg-gray-800 hover:bg-gray-900 text-white" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {isAdminLogin ? <Shield className="h-4 w-4" /> : <Mountain className="h-4 w-4" />}
                  <span>Sign In</span>
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
