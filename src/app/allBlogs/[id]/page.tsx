"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, Calendar } from "lucide-react";
import Image from "next/image";

interface FormattedContent {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

interface ContentItem {
  type: string;
  text?: string;
  rawContent?: string;
  formattedContent?: FormattedContent[];
  alt?: string;
  src?: string;
  level?: number;
}

interface Tag {
  id: string;
  title: string;
}

interface Blog {
  title: string;
  coverImageUrl: string;
  employee?: { name: string };
  date: string;
  readTime: number;
  tags: Tag[];
  content: ContentItem[];
  conclusion?: ContentItem[];
}

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const renderContent = (items: ContentItem[]) => {
  return items.map((item, index) => {
    switch (item.type) {
      case "text":
        return (
          <p key={index} className="mb-4">
            {item.formattedContent?.length ? (
              item.formattedContent.map((segment, i) => (
                <span
                  key={i}
                  className={`${segment.bold ? "font-bold" : ""} ${segment.italic ? "italic" : ""}`}
                >
                  {segment.text}
                </span>
              ))
            ) : (
              <span>{item.text || ""}</span>
            )}
          </p>
        );
      case "heading":
        const level = item.level || 1;
        const content = item.formattedContent?.length ? (
          item.formattedContent.map((segment, i) => (
            <span
              key={i}
              className={`${segment.bold ? "font-bold" : ""} ${segment.italic ? "italic" : ""}`}
            >
              {segment.text}
            </span>
          ))
        ) : (
          <span>{item.text || ""}</span>
        );
        
        return (
          <h1 key={index} className="text-2xl font-semibold mb-4">
            {content}
          </h1>
        );
      case "image":
        if (!item.src) return null;
        const isBase64 = item.src.startsWith("data:image");
        const isRemote = isValidUrl(item.src);
        if (isBase64 || !isRemote) {
          return (
            <img
              key={index}
              src={item.src}
              alt={item.alt || ""}
              className="w-full h-auto my-4 rounded-lg"
            />
          );
        } else {
          return (
            <Image
              key={index}
              src={item.src}
              alt={item.alt || ""}
              height={400}
              width={800}
              className="w-full h-auto my-4 rounded-lg"
            />
          );
        }
      default:
        return null;
    }
  });
};

const SingleBlog = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await fetch(`https://staging.api.infigon.app/v1/blogs/${params.id}`);
        if (!res.ok) throw new Error("Failed to fetch blog");
        const data: Blog = await res.json();
        setBlog(data);
      } catch (error) {
        console.error("Error fetching blog:", error);
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchBlog();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Blog Not Found</h1>
          <Button onClick={() => router.push("/allBlogs")}>Back to All Blogs</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push("/allBlogs")}
          className="flex items-center gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Blogs
        </Button>

        <article className="bg-card rounded-lg shadow-lg overflow-hidden">
          <div className="aspect-video overflow-hidden">
            {isValidUrl(blog.coverImageUrl) ? (
              <Image
                src={blog.coverImageUrl}
                alt={blog.title}
                height={400}
                width={800}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src="/placeholder.png"
                alt="Fallback cover"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="p-8">
            <h1 className="text-4xl font-bold mb-4">{blog.title}</h1>

            <div className="flex items-center gap-6 text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {blog.employee?.name || "Unknown"}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(blog.date).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {blog.readTime} min read
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              {blog.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.title}
                </Badge>
              ))}
            </div>

            <div className="prose prose-lg max-w-none">
              {blog.content?.length ? renderContent(blog.content) : <p>No content</p>}
            </div>

            {blog.conclusion?.length ? (
              <div className="mt-8 p-6 bg-muted rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Conclusion</h2>
                {renderContent(blog.conclusion)}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
};

export default SingleBlog;
