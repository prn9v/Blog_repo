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
  rawContent?: string;
  formattedContent?: FormattedText[];
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
  coverImageUrl: string;
  coverImageAlt: string;
  BlogType: string;
  sourceUrl: string;
  author: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  imageUrls: string[];
}

interface BlogPostJSON {
  title: string;
  slug: string;
  content: ContentBlock[];
  conclusion?: ContentBlock[];
  readTime: number;
  excerpt: string;
  coverImageUrl: string;
  BlogType: string;
  sourceUrl: string;
  keywords: string[];
  tags: string[];
  imageUrls: string[];
  seoTitle: string;
  seoDescription: string;
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
    coverImageUrl: "",
    coverImageAlt: "",
    BlogType: "",
    sourceUrl: "",
    author: "",
    keywords: [],
    seoTitle: "",
    seoDescription: "",
    tags: [],
    imageUrls: []
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

  const parseFormattedText = (text: string): FormattedText[] => {
    const parts: FormattedText[] = [];
    let currentIndex = 0;
    
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

    matches.sort((a, b) => a.index - b.index);

    matches.forEach(match => {
      if (match.index > currentIndex) {
        const plainText = text.substring(currentIndex, match.index);
        if (plainText) {
          parts.push({ text: plainText });
        }
      }

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

    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        parts.push({ text: remainingText });
      }
    }

    return parts.length > 0 ? parts : [{ text }];
  };

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
      
      const codeBlockMatch = trimmedLine.match(/^```(\w+)?$/);
      if (codeBlockMatch) {
        if (!inCodeBlock) {
          if (currentBlock) {
            blocks.push(currentBlock);
            currentBlock = null;
          }
          inCodeBlock = true;
          codeLanguage = codeBlockMatch[1] || '';
          codeContent = '';
        } else {
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

      if (!trimmedLine && !currentBlock && !inList && !inTable) continue;

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
        if (listItems.length > 0) {
          listItems[listItems.length - 1] += ' ' + trimmedLine;
        }
        continue;
      } else if (inList) {
        blocks.push({ 
          type: 'list', 
          items: listItems,
          rawContent: listItems.map(item => `- ${item}`).join('\n')
        });
        listItems = [];
        inList = false;
      }

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
          currentBlock.formattedContent = parseFormattedText(currentBlock.text!);
        }
      } else if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    }

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      setFormData(prev => ({ 
        ...prev, 
        coverImage: file,
        coverImageUrl: dataUrl,
        imageUrls: [...prev.imageUrls, dataUrl]
      }));
    }
  };

  const calculateWordCount = (content: string): number => {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.author || !formData.coverImageAlt || !formData.BlogType) {
      alert("Please fill in all required fields (Title, Content, Author, Cover Image Alt, and Blog Type).");
      return;
    }

    try {
      const accessToken = localStorage.getItem('accessToken');
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');

    if (!accessToken || !role || !userId) {
      alert("User not authenticated. Please log in again.");
      return;
    }

    if (role !== 'SUPER_ADMIN') {
      alert("You are not authorized to perform this action.");
      return;
    }

      const parsedContent = parseContentToJSON(formData.content);
      const parsedConclusion = formData.conclusion ? parseContentToJSON(formData.conclusion) : undefined;
      
      const wordCount = calculateWordCount(formData.content + (formData.conclusion || ''));
      const estimatedReadTime = Math.ceil(wordCount / 200);

      const blogPostJSON: BlogPostJSON = {
        title: formData.title,
        slug: formData.slug,
        content: parsedContent,
        conclusion: parsedConclusion,
        readTime: estimatedReadTime,
        excerpt: formData.excerpt,
        coverImageUrl: formData.coverImageUrl,
        BlogType: formData.BlogType,
        sourceUrl: formData.sourceUrl,
        keywords: formData.keywords,
        tags: formData.tags,
        imageUrls: formData.imageUrls,
        seoTitle: formData.seoTitle,
        seoDescription: formData.seoDescription
      };

      const response = await fetch('https://staging.api.infigon.app/v1/teams/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(blogPostJSON),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Blog post created successfully:', result);

      router.push("/");
    } catch (error) {
      console.error("Error creating blog post:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      alert(`Error creating blog post: ${errorMessage}`);
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
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>Title, author, excerpt, and blog type</CardDescription>
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
                  <Label>Blog Type *</Label>
                  <Input value={formData.BlogType} onChange={(e) => setFormData(p => ({ ...p, BlogType: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Source URL</Label>
                  <Input value={formData.sourceUrl} onChange={(e) => setFormData(p => ({ ...p, sourceUrl: e.target.value }))} />
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