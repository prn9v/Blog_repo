'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, X, ArrowLeft, FileText } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface FormattedText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: {
    url: string;
    text: string;
  };
}

interface ContentBlock {
  type: 'text' | 'heading' | 'image' | 'table' | 'list' | 'code' | 'blockquote';
  level?: number;
  text?: string;
  rawContent?: string; // Store original markdown for exact reconstruction
  formattedContent?: FormattedText[]; // Store parsed formatting
  alt?: string;
  src?: string;
  headers?: string[];
  rows?: string[][];
  items?: string[];
  language?: string;
}

interface BlogPost {
  title: string;
  slug: string;
  content: string;
  conclusion?: string;
  readTime: number;
  excerpt: string;
  coverImage?: File;
  coverImageAlt: string;
  date: string;
  author: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
  tags: string[];
}

interface BlogPostJSON {
  title: string;
  slug: string;
  content: ContentBlock[];
  conclusion?: ContentBlock[];
  readTime: number;
  excerpt: string;
  coverImage?: {
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  };
  coverImageAlt: string;
  date: string;
  author: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  metadata: {
    wordCount: number;
    estimatedReadTime: number;
    contentBlocks: number;
  };
}

const CreateBlog = () => {
  const router = useRouter();

  const [formData, setFormData] = useState<BlogPost>({
    title: "",
    slug: "",
    content: "",
    conclusion: "",
    readTime: 1,
    excerpt: "",
    coverImageAlt: "",
    date: new Date().toISOString(),
    author: "",
    keywords: [],
    seoTitle: "",
    seoDescription: "",
    tags: []
  });

  const [newKeyword, setNewKeyword] = useState("");
  const [newTag, setNewTag] = useState("");

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
      seoTitle: title.length <= 60 ? title : title.substring(0, 60)
    }));
  };

  // Parse formatted text (bold, italic, links, code)
  const parseFormattedText = (text: string): FormattedText[] => {
    const parts: FormattedText[] = [];
    let currentIndex = 0;
    
    // Regex patterns for different formatting
    const patterns = [
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
      { regex: /\*([^*]+)\*/g, type: 'italic' },
      { regex: /`([^`]+)`/g, type: 'code' },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' }
    ];

    const matches: Array<{
      index: number;
      length: number;
      text: string;
      type: string;
      url?: string;
    }> = [];

    // Find all matches
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          text: match[1],
          type: pattern.type,
          url: pattern.type === 'link' ? match[2] : undefined
        });
      }
    });

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Process text with formatting
    matches.forEach(match => {
      // Add text before the match
      if (match.index > currentIndex) {
        const plainText = text.substring(currentIndex, match.index);
        if (plainText) {
          parts.push({ text: plainText });
        }
      }

      // Add formatted text
      const formattedPart: FormattedText = { text: match.text };
      
      switch (match.type) {
        case 'bold':
          formattedPart.bold = true;
          break;
        case 'italic':
          formattedPart.italic = true;
          break;
        case 'code':
          formattedPart.code = true;
          break;
        case 'link':
          formattedPart.link = { url: match.url!, text: match.text };
          break;
      }
      
      parts.push(formattedPart);
      currentIndex = match.index + match.length;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        parts.push({ text: remainingText });
      }
    }

    return parts.length > 0 ? parts : [{ text }];
  };

  // Parse markdown content to JSON structure
  const parseContentToJSON = (markdownContent: string): ContentBlock[] => {
    if (!markdownContent) return [];

    const blocks: ContentBlock[] = [];
    const lines = markdownContent.split('\n');
    let currentBlock: ContentBlock | null = null;
    let tableRows: string[][] = [];
    let inTable = false;
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';
    let listItems: string[] = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Handle code blocks
      const codeBlockMatch = trimmedLine.match(/^```(\w+)?$/);
      if (codeBlockMatch) {
        if (!inCodeBlock) {
          // Start of code block
          if (currentBlock) {
            blocks.push(currentBlock);
            currentBlock = null;
          }
          inCodeBlock = true;
          codeLanguage = codeBlockMatch[1] || '';
          codeContent = '';
        } else {
          // End of code block
          blocks.push({
            type: 'code',
            rawContent: '```' + codeLanguage + '\n' + codeContent + '\n```',
            text: codeContent,
            language: codeLanguage
          });
          inCodeBlock = false;
          codeContent = '';
          codeLanguage = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += (codeContent ? '\n' : '') + line;
        continue;
      }

      // Skip empty lines unless we're building a block
      if (!trimmedLine && !currentBlock && !inList && !inTable) continue;

      // Handle blockquotes
      const blockquoteMatch = trimmedLine.match(/^>\s*(.+)/);
      if (blockquoteMatch) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        if (inList) {
          blocks.push({ 
            type: 'list', 
            items: listItems,
            rawContent: listItems.map(item => `- ${item}`).join('\n')
          });
          listItems = [];
          inList = false;
        }
        blocks.push({
          type: 'blockquote',
          text: blockquoteMatch[1],
          rawContent: trimmedLine,
          formattedContent: parseFormattedText(blockquoteMatch[1])
        });
        continue;
      }

      // Handle images
      const imageMatch = trimmedLine.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        if (inList) {
          blocks.push({ 
            type: 'list', 
            items: listItems,
            rawContent: listItems.map(item => `- ${item}`).join('\n')
          });
          listItems = [];
          inList = false;
        }
        blocks.push({
          type: 'image',
          alt: imageMatch[1],
          src: imageMatch[2],
          rawContent: trimmedLine
        });
        continue;
      }

      // Handle tables
      if (trimmedLine.includes('|') && !trimmedLine.match(/^[\s\-\|]+$/)) {
        if (!inTable) {
          if (currentBlock) {
            blocks.push(currentBlock);
            currentBlock = null;
          }
          if (inList) {
            blocks.push({ 
              type: 'list', 
              items: listItems,
              rawContent: listItems.map(item => `- ${item}`).join('\n')
            });
            listItems = [];
            inList = false;
          }
          inTable = true;
          tableRows = [];
        }
        
        const cells = trimmedLine.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (cells.length > 0) {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        // End of table
        if (tableRows.length > 0) {
          const tableMarkdown = tableRows.map(row => `| ${row.join(' | ')} |`).join('\n');
          blocks.push({
            type: 'table',
            headers: tableRows[0] || [],
            rows: tableRows.slice(1) || [],
            rawContent: tableMarkdown
          });
        }
        inTable = false;
        tableRows = [];
      }

      // Handle lists
      const listMatch = trimmedLine.match(/^[-*+]\s+(.+)/);
      if (listMatch) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        if (!inList) {
          inList = true;
          listItems = [];
        }
        listItems.push(listMatch[1]);
        continue;
      } else if (inList && trimmedLine) {
        // Continue list item on next line
        if (listItems.length > 0) {
          listItems[listItems.length - 1] += ' ' + trimmedLine;
        }
        continue;
      } else if (inList) {
        // End of list
        blocks.push({ 
          type: 'list', 
          items: listItems,
          rawContent: listItems.map(item => `- ${item}`).join('\n')
        });
        listItems = [];
        inList = false;
      }

      // Handle headings
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        blocks.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2],
          rawContent: trimmedLine,
          formattedContent: parseFormattedText(headingMatch[2])
        });
        continue;
      }

      // Handle text content
      if (trimmedLine) {
        if (!currentBlock) {
          currentBlock = {
            type: 'text',
            text: trimmedLine,
            rawContent: trimmedLine,
            formattedContent: parseFormattedText(trimmedLine)
          };
        } else {
          currentBlock.text += '\n' + trimmedLine;
          currentBlock.rawContent += '\n' + trimmedLine;
          // Re-parse formatted content for the entire block
          currentBlock.formattedContent = parseFormattedText(currentBlock.text!);
        }
      } else if (currentBlock) {
        // Empty line ends current text block
        blocks.push(currentBlock);
        currentBlock = null;
      }
    }

    // Add any remaining blocks
    if (currentBlock) {
      blocks.push(currentBlock);
    }
    
    if (inTable && tableRows.length > 0) {
      const tableMarkdown = tableRows.map(row => `| ${row.join(' | ')} |`).join('\n');
      blocks.push({
        type: 'table',
        headers: tableRows[0] || [],
        rows: tableRows.slice(1) || [],
        rawContent: tableMarkdown
      });
    }

    if (inList && listItems.length > 0) {
      blocks.push({ 
        type: 'list', 
        items: listItems,
        rawContent: listItems.map(item => `- ${item}`).join('\n')
      });
    }

    return blocks;
  };

  // Convert file to base64 data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !formData.keywords.includes(trimmed)) {
      setFormData(prev => ({ ...prev, keywords: [...prev.keywords, trimmed] }));
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== keyword) }));
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, coverImage: file }));
    }
  };

  const calculateWordCount = (content: string): number => {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.author || !formData.coverImageAlt) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      // Parse content to structured format
      const parsedContent = parseContentToJSON(formData.content);
      const parsedConclusion = formData.conclusion ? parseContentToJSON(formData.conclusion) : undefined;
      
      // Calculate metadata
      const wordCount = calculateWordCount(formData.content + (formData.conclusion || ''));
      const estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute

      // Handle cover image
      let coverImageData = undefined;
      if (formData.coverImage) {
        const dataUrl = await fileToDataUrl(formData.coverImage);
        coverImageData = {
          name: formData.coverImage.name,
          size: formData.coverImage.size,
          type: formData.coverImage.type,
          dataUrl: dataUrl
        };
      }

      // Create structured blog post JSON
      const blogPostJSON: BlogPostJSON = {
        title: formData.title,
        slug: formData.slug,
        content: parsedContent,
        conclusion: parsedConclusion,
        readTime: formData.readTime,
        excerpt: formData.excerpt,
        coverImage: coverImageData,
        coverImageAlt: formData.coverImageAlt,
        date: formData.date,
        author: formData.author,
        keywords: formData.keywords,
        seoTitle: formData.seoTitle,
        seoDescription: formData.seoDescription,
        tags: formData.tags,
        metadata: {
          wordCount,
          estimatedReadTime,
          contentBlocks: parsedContent.length + (parsedConclusion?.length || 0)
        }
      };

      console.log("Blog Post Created with Structured Content:", blogPostJSON);
      console.log("JSON String:", JSON.stringify(blogPostJSON, null, 2));

      // You can also send this to your backend API
      // await fetch('/api/blogs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(blogPostJSON)
      // });

      router.push("/");
    } catch (error) {
      console.error("Error creating blog post:", error);
      alert("Error processing blog post. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-10">
      <div className="container max-w-4xl mx-auto px-4 space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create Blog Post</h1>
              <p className="text-sm text-muted-foreground">Write something worth reading ✍️</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>Title, author, excerpt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData(p => ({ ...p, slug: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Author *</Label>
                  <Input value={formData.author} onChange={(e) => setFormData(p => ({ ...p, author: e.target.value }))} />
                </div>
                <div>
                  <Label>Read Time (min)</Label>
                  <Input type="number" value={formData.readTime} min="1" max="1440" onChange={(e) => setFormData(p => ({ ...p, readTime: +e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Excerpt</Label>
                <Textarea value={formData.excerpt} onChange={(e) => setFormData(p => ({ ...p, excerpt: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          {/* Markdown Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>Write your blog in Markdown - formatting will be preserved in JSON</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label>Main Content *</Label>
              <div className="border rounded-md">
                <MDEditor
                  value={formData.content}
                  onChange={(v) => setFormData(p => ({ ...p, content: v || "" }))}
                  height={400}
                />
              </div>
              <Label>Conclusion (Optional)</Label>
              <div className="border rounded-md">
                <MDEditor
                  value={formData.conclusion}
                  onChange={(v) => setFormData(p => ({ ...p, conclusion: v || "" }))}
                  height={200}
                />
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Upload</Label>
                  <Input type="file" accept="image/*" onChange={handleImageChange} />
                </div>
                <div>
                  <Label>Alt Text *</Label>
                  <Input value={formData.coverImageAlt} onChange={(e) => setFormData(p => ({ ...p, coverImageAlt: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEO and Tags */}
          <Card>
            <CardHeader>
              <CardTitle>SEO & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>SEO Title</Label>
                  <Input maxLength={60} value={formData.seoTitle} onChange={(e) => setFormData(p => ({ ...p, seoTitle: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">{formData.seoTitle.length}/60 characters</p>
                </div>
                <div>
                  <Label>SEO Description</Label>
                  <Textarea maxLength={160} value={formData.seoDescription} onChange={(e) => setFormData(p => ({ ...p, seoDescription: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">{formData.seoDescription.length}/160 characters</p>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <Label>Keywords</Label>
                <div className="flex gap-2">
                  <Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())} />
                  <Button type="button" onClick={addKeyword}><PlusCircle className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.keywords.map(keyword => (
                    <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                      {keyword}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeKeyword(keyword)} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                  <Button type="button" onClick={addTag}><PlusCircle className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push("/")}>Cancel</Button>
            <Button type="submit">Create Blog Post</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBlog;