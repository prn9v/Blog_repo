"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Login = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (formData.email && formData.password) {
    try {
      const response = await fetch(
        "https://staging.api.infigon.app/v1/teams/auth/login",
        {
          method: "POST",
          headers: {
            Accept: "*/*",
            "Content-Type": "application/json",
          },
          credentials: "include", 
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Login failed:", data);
        alert(`Login failed: ${data.message || response.statusText}`);
        return;
      }

      console.log("Login successful:", data);
      alert("Login successful!");
      router.push("/createBlog");
    } catch (error) {
      console.error("Error during login:", error);
      alert("An error occurred during login. Please try again.");
    }
  } else {
    alert("Please fill in both email and password.");
  }
};

  const checkLoginStatus = (): boolean => {
    const authCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth_token=")); // Replace 'auth_token' with your cookie name
    if (authCookie) {
      console.log("Auth cookie found:", authCookie);
      return true;
    }

    // Example: Check for a token in localStorage or sessionStorage
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (token) {
      console.log(
        "Auth token found in storage:",
        token.substring(0, 10) + "..."
      ); // Log partial token for security
      return true;
    }

    console.log("No auth cookie or token found");
    return false;
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the blog dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Enter your password"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
