"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowser()

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      setSession(session)
      setUser(session?.user ?? null)
      setIsAdmin(session?.user?.email === "admin@slf.com")
      setIsLoading(false)
    }

    // Get initial session
    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.email)

      setSession(session)
      setUser(session?.user ?? null)
      setIsAdmin(session?.user?.email === "admin@slf.com")
      setIsLoading(false)

      if (event === "SIGNED_IN" && session) {
        console.log("User signed in, redirecting to appropriate page")
        if (session.user.email === "admin@slf.com") {
          router.push("/admin")
        } else {
          router.push("/insert")
        }
      } else if (event === "SIGNED_OUT" || !session) {
        console.log("User signed out or no session, redirecting to /login")
        router.push("/login")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signIn = async (email: string, password: string) => {
    console.log("Attempting to sign in with:", email)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Sign in error:", error)
    } else {
      console.log("Sign in successful, waiting for auth state change")
    }

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
  }

  const value = {
    user,
    session,
    isLoading,
    isAdmin,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
