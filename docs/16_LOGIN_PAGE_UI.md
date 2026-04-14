# Login Page UI Implementation

Update the `apps/web/app/(auth)/login/page.tsx` file to reflect the new tabbed authentication policy. 

## Dependencies
Ensure the necessary `shadcn/ui` components are installed:
\`\`\`bash
npx shadcn-ui@latest add tabs card input label button form
\`\`\`

## Code

\`\`\`tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Mail, ShieldAlert, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const adminLoginSchema = z.object({
  email: z.string().email({ message: 'Valid email is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  totp: z.string().optional(),
})

type AdminFormValues = z.infer<typeof adminLoginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isAdminLoading, setIsAdminLoading] = useState(false)

  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '', totp: '' },
  })

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      toast.error('Failed to connect to Google.')
      setIsGoogleLoading(false)
    }
  }

  const onSubmitAdmin = async (data: AdminFormValues) => {
    setIsAdminLoading(true)
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
        totp: data.totp,
      })

      if (res?.error) {
        if (res.error.includes('2FA')) {
          toast.error('Invalid or missing 2FA code.')
        } else {
          toast.error('Invalid email or password.')
        }
      } else {
        toast.success('Admin login successful.')
        router.push('/admin')
      }
    } catch (error) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsAdminLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8">
        
        {/* Logo and Header Section */}
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] mb-6">
            <span className="text-3xl font-bold text-slate-900">IUT</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-100">IPE-24 Portal</h1>
          <p className="text-slate-400 mt-2">Islamic University of Technology</p>
        </div>

        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-900 border border-slate-800">
            <TabsTrigger value="student" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">Student</TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">CR / Admin</TabsTrigger>
          </TabsList>

          {/* STUDENT TAB */}
          <TabsContent value="student">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">Student Access</CardTitle>
                <CardDescription className="text-slate-400">
                  Sign in using your official university email.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg text-sm flex gap-3 items-start">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>Only pre-approved <strong>@iut-dhaka.edu</strong> accounts can access the portal.</p>
                </div>
                
                <Button 
                  onClick={handleGoogleLogin} 
                  disabled={isGoogleLoading}
                  className="w-full bg-white text-slate-900 hover:bg-slate-200 h-12 text-base font-medium"
                >
                  {isGoogleLoading ? 'Connecting...' : 'Continue with Google OAuth'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADMIN TAB */}
          <TabsContent value="admin">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">Admin Area</CardTitle>
                <CardDescription className="text-slate-400">
                  Restricted access for Class Representatives.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitAdmin)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300">Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                              <Input placeholder="admin@iut-dhaka.edu" className="pl-10 bg-slate-950 border-slate-800 text-slate-100" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                              <Input type="password" placeholder="••••••••" className="pl-10 bg-slate-950 border-slate-800 text-slate-100" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="totp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300">2FA Code (Super Admin)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                              <Input placeholder="123456" className="pl-10 bg-slate-950 border-slate-800 text-slate-100" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={isAdminLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11"
                    >
                      {isAdminLoading ? 'Authenticating...' : 'Sign in to Admin Dashboard'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Lock className="w-4 h-4" />
          <p>Your data is securely handled via NextAuth.</p>
        </div>
      </div>
    </div>
  )
}
\`\`\`