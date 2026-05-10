import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAdminLogin, useGetAdminMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAdminMeQueryKey } from "@workspace/api-client-react/generated/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in
  const { data: adminMe } = useGetAdminMe();
  useEffect(() => {
    if (adminMe?.authenticated) {
      setLocation("/dashboard");
    }
  }, [adminMe, setLocation]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" }
  });

  const loginMutation = useAdminLogin();

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await loginMutation.mutateAsync({ data });
      if (result.success && result.token) {
        localStorage.setItem("admin_token", result.token);
        queryClient.invalidateQueries({ queryKey: getGetAdminMeQueryKey() });
        setLocation("/dashboard");
        toast({
          title: "Access Granted",
          description: "Welcome to the command center.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Invalid credentials.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error.message || "Invalid credentials.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary mb-2">
            <ShieldAlert size={24} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Operator Login
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Authenticate to access the command center
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Identifier
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  className="bg-input/50 font-mono text-sm"
                  {...register("username")}
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Passcode
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-input/50 font-mono text-sm"
                  {...register("password")}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full font-bold tracking-wide" 
              disabled={isLoading}
            >
              {isLoading ? "AUTHENTICATING..." : "INITIATE SESSION"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
