"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { login, isAuthenticated } from "@/lib/auth"
import { FocalDiveLogo } from "@/components/logo"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/")
    } else {
      setChecking(false)
    }
  }, [router])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Small delay so the button shows loading state
    setTimeout(() => {
      const success = login(username, password)
      if (success) {
        router.replace("/")
      } else {
        toast.error("Invalid username or password")
        setLoading(false)
      }
    }, 300)
  }

  if (checking) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">


        {/* Login card */}
        <Card className="border-border bg-card">
          <CardHeader>
            {/* Logo & title */}
            <div className="flex flex-row items-start mb-8 gap-4">
              <FocalDiveLogo size={48} />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">FocalDive</h1>
                <p className="text-sm text-muted-foreground font-mono tracking-wider uppercase mt-">
                  Invoice Manager
                </p>
              </div>
            </div>
            <CardTitle>Login to our system</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  className="rounded-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="rounded-full"
                />
              </div>

              <Button type="submit" variant={"outline"} className="w-full rounded-full border border-primary hover:bg-primary hover:text-black" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div >
  )
}
