import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md border border-border/50 bg-card shadow-sm rounded-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Allowance Manager</CardTitle>
          <CardDescription className="text-sm text-muted-foreground font-medium">
            Private Admin Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground font-medium">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter username"
                required
                className="rounded-xl border-border bg-background focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                required
                className="rounded-xl border-border bg-background focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl mt-6 transition-colors duration-200"
              type="submit"
            >
              Log In
            </Button>
          </form>
        </CardContent>
        {message && (
          <CardFooter className="pt-0 pb-6 flex justify-center">
            <p className="text-center text-sm text-destructive font-medium bg-destructive/10 px-3 py-1.5 rounded-lg w-full">
              {message}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
