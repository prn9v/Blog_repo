"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, Calendar, List } from "lucide-react";
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

interface TocItem {
  id: string;
  title: string;
  level: number;
}

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const generateId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const extractTextFromFormattedContent = (formattedContent: FormattedContent[]): string => {
  return formattedContent.map(segment => segment.text).join('');
};

const renderContent = (items: ContentItem[], tocItems: TocItem[]) => {
  return items.map((item, index) => {
    switch (item.type) {
      case "text":
        return (
          <p key={index} className="mb-4">
            {item.formattedContent && item.formattedContent.length > 0 ? (
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
        const headingText = item.formattedContent && item.formattedContent.length > 0
          ? extractTextFromFormattedContent(item.formattedContent)
          : item.text || "";
        
        const headingId = generateId(headingText);
        
        // Add to TOC items
        if (headingText && !tocItems.some(toc => toc.id === headingId)) {
          tocItems.push({
            id: headingId,
            title: headingText,
            level: level
          });
        }

        const content = item.formattedContent && item.formattedContent.length > 0 ? (
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
        
        const HeadingTag = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : level === 4 ? 'h4' : level === 5 ? 'h5' : 'h6';
        const headingClasses = level === 1 ? "text-2xl font-semibold mb-4" : 
                              level === 2 ? "text-xl font-semibold mb-3" :
                              level === 3 ? "text-lg font-semibold mb-3" :
                              "text-base font-semibold mb-2";

        return (
          <HeadingTag key={index} id={headingId} className={headingClasses}>
            {content}
          </HeadingTag>
        );
      case "image":
        if (!item.src) return null;
        const isBase64 = item.src.startsWith("data:image");
        const isRemote = isValidUrl(item.src);
        if (isBase64 || !isRemote) {
          return (
            <Image
              height={300}
              width={300}
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

const TableOfContents = ({ tocItems, onItemClick }: { 
  tocItems: TocItem[], 
  onItemClick: (id: string) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-24 right-4 z-50">
      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden mb-2 bg-white shadow-lg"
      >
        <List className="h-4 w-4" />
      </Button>

      {/* TOC Container */}
      <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72 max-h-96 overflow-y-auto ${
        isOpen ? 'block' : 'hidden md:block'
      }`}>
        <h3 className="font-semibold text-sm mb-3 text-gray-900 border-b pb-2">
          Table of Contents
        </h3>
        <nav>
          <ul className="space-y-1">
            {tocItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onItemClick(item.id);
                    setIsOpen(false); // Close on mobile after click
                  }}
                  className={`text-left w-full px-2 py-1 text-sm hover:bg-gray-100 rounded transition-colors duration-200 ${
                    item.level === 1 ? 'font-medium text-gray-900' :
                    item.level === 2 ? 'text-gray-700 pl-4' :
                    'text-gray-600 pl-6'
                  }`}
                  style={{ paddingLeft: `${item.level * 8}px` }}
                >
                  {item.title}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => {
                  onItemClick('conclusion');
                  setIsOpen(false);
                }}
                className="text-left w-full px-2 py-1 text-sm hover:bg-gray-100 rounded transition-colors duration-200 font-medium text-gray-900"
              >
                Conclusion
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

const SingleBlog = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

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

  const handleTocItemClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  console.log("blog: ", blog);

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

  // Reset TOC items for fresh render
  const currentTocItems: TocItem[] = [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted relative">
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
              <Image
                src="/placeholder.png"
                alt="Fallback cover"
                height={400}
                width={800}
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
              {blog.content?.length ? renderContent(blog.content, currentTocItems) : <p>No content</p>}
            </div>

            {blog.conclusion?.length ? (
              <div id="conclusion" className="mt-8 p-6 bg-muted rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Conclusion</h2>
                {renderContent(blog.conclusion, [])}
              </div>
            ) : null}
          </div>
        </article>
      </div>

      {/* Table of Contents */}
      {currentTocItems.length > 0 && (
        <TableOfContents 
          tocItems={currentTocItems} 
          onItemClick={handleTocItemClick}
        />
      )}
    </div>
  );
};

export default SingleBlog;