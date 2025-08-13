"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  coverImageAlt?: string;
  readTime: number;
  tags: string[] | { id: string; title: string }[]; // Handle both formats
  employee?: { id: string; name: string };
  author?: string; // Alternative author field
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

interface BlogsResponse {
  blogs: Blog[];
  total?: number;
  page?: number;
  limit?: number;
}

// Helper to check if a URL is valid
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Helper to normalize tags (handle both string[] and object[] formats)
const normalizeTags = (tags: string[] | { id: string; title: string }[]): string[] => {
  if (!tags || tags.length === 0) return [];
  
  // If it's an array of strings
  if (typeof tags[0] === 'string') {
    return tags as string[];
  }
  
  // If it's an array of objects
  return (tags as { id: string; title: string }[]).map(tag => tag.title);
};

const AllTeamBlogs = () => {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          "https://staging.api.infigon.app/v1/teams/blogs",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include", // Add credentials for authentication
          }
        );

        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `HTTP error! Status: ${response.status}`
          );
        }

        const data: BlogsResponse = await response.json();
        console.log("Fetched data:", data);
        
        // Handle different response structures
        const blogsArray = data.blogs || data || [];
        setBlogs(Array.isArray(blogsArray) ? blogsArray : []);
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch blogs";
        console.error("Error fetching blogs:", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const handleUpdateClick = (id: string) => {
    router.push(`/update/${id}`);
  };

  const handleViewClick = (id: string) => {
    router.push(`/allBlogs/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-lg">Loading blogs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <h1 className="text-4xl font-bold">All Blogs</h1>
          </div>
          
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-xl font-semibold mb-2">Error Loading Blogs</p>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div>
            <h1 className="text-4xl font-bold">All Blogs</h1>
            <p className="text-muted-foreground mt-1">
              {blogs.length} blog{blogs.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        {blogs.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">No Blogs Found</h2>
              <p className="text-muted-foreground mb-4">
                There are no blogs available at the moment.
              </p>
              <Button onClick={() => router.push("/create")}>
                Create Your First Blog
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => {
              const normalizedTags = normalizeTags(blog.tags);
              const authorName = blog.employee?.name || blog.author || "Unknown Author";
              
              return (
                <Card
                  key={blog.id}
                  className="group hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="aspect-video overflow-hidden">
                    <Image
                      src={
                        isValidUrl(blog.coverImageUrl)
                          ? blog.coverImageUrl
                          : "/placeholder.png"
                      }
                      alt={blog.coverImageAlt || blog.title || "Blog cover image"}
                      width={800}
                      height={450}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.png";
                      }}
                    />
                  </div>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                      {blog.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {blog.excerpt || "No excerpt available"}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span className="truncate">{authorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {blog.readTime || 1} min read
                      </div>
                    </div>
                    
                    {normalizedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {normalizedTags.slice(0, 3).map((tag, index) => (
                          <Badge key={`${blog.id}-tag-${index}`} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                        {normalizedTags.length > 3 && (
                          <Badge variant="outline">
                            +{normalizedTags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewClick(blog.id)}
                        className="flex-1"
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateClick(blog.id)}
                        className="flex-1"
                      >
                        Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllTeamBlogs;