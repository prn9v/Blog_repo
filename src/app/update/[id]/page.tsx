"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, X, ArrowLeft, FileText, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

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
  type: "text" | "heading" | "image" | "table" | "list" | "code" | "blockquote";
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
  conclusion: string;
  readTime: number;
  excerpt: string;
  coverImage?: File;
  coverImageUrl: string;
  coverImageAlt: string;
  sourceUrl: string;
  keywords: (string | { id: string; word?: string; title?: string })[];
  seoTitle: string;
  seoDescription: string;
  tags: (string | { id: string; word?: string; title?: string })[];
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
  keywords: (string | { id: string; word?: string; title?: string })[];
  tags: (string | { id: string; word?: string; title?: string })[];
  imageUrls: string[];
  seoTitle: string;
  seoDescription: string;
}

const UpdateBlog = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const contentEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const conclusionEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const [originalFormData, setOriginalFormData] = useState<BlogPost | null>(
    null
  );

  const [formData, setFormData] = useState<BlogPost>({
    title: "",
    slug: "",
    content: "",
    conclusion: "",
    readTime: 1,
    excerpt: "",
    coverImageUrl: "",
    coverImageAlt: "",
    sourceUrl: "",
    keywords: [],
    seoTitle: "",
    seoDescription: "",
    tags: [],
    imageUrls: [],
  });

  const [newKeyword, setNewKeyword] = useState("");
  const [newTag, setNewTag] = useState("");

  // Fetch blog data on component mount
  useEffect(() => {
    const fetchBlog = async () => {
      if (!params.id) return;

      console.log(params.id);
      try {
        setLoading(true);
        const response = await fetch(
          `https://staging.api.infigon.app/v1/teams/blogs/${params.id}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch blog");
        }

        const blogData = await response.json();

        // Convert content blocks back to markdown for editing
        const contentMarkdown =
          blogData.content
            ?.map((block: ContentBlock) => {
              return block.rawContent ?? block.text ?? "";
            })
            .join("\n\n") ?? "";
        const conclusionMarkdown =
          blogData.conclusion
            ?.map((block: ContentBlock) => {
              return block.rawContent ?? block.text ?? "";
            })
            .join("\n\n") ?? "";

        const fetchedData = {
          title: blogData.title || "",
          slug: blogData.slug || "",
          content: contentMarkdown,
          conclusion: conclusionMarkdown,
          readTime: blogData.readTime || 1,
          excerpt: blogData.excerpt || "",
          coverImageUrl: blogData.coverImageUrl || "",
          coverImageAlt: blogData.coverImageAlt || "",
          sourceUrl: blogData.sourceUrl || "",
          keywords: blogData.keywords || [],
          seoTitle: blogData.seoTitle || "",
          seoDescription: blogData.seoDescription || "",
          tags: blogData.tags || [],
          imageUrls: blogData.imageUrls || [],
        };

        setFormData(fetchedData);
        setOriginalFormData(fetchedData); // Store original data for comparison
      } catch (error) {
        console.error("Error fetching blog:", error);
        alert("Failed to load blog data");
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [params.id]);

  type KeywordOrTag = string | { id: string; word?: string; title?: string };

  const arraysEqual = (a: KeywordOrTag[], b: KeywordOrTag[]): boolean => {
    if (a.length !== b.length) return false;
    return JSON.stringify(a.sort()) === JSON.stringify(b.sort());
  };

  // Helper function to get changed fields
  const getChangedFields = (original: BlogPost, current: BlogPost) => {
    const changes: Partial<BlogPostJSON> = {};

    // Compare each field
    if (original.title !== current.title) {
      changes.title = current.title;
    }

    if (original.slug !== current.slug) {
      changes.slug = current.slug;
    }

    if (original.content !== current.content) {
      changes.content = parseContentToJSON(current.content);
    }

    if (original.conclusion !== current.conclusion) {
      if (current.conclusion) {
        changes.conclusion = parseContentToJSON(current.conclusion);
      } else {
        changes.conclusion = undefined;
      }
    }

    if (original.readTime !== current.readTime) {
      changes.readTime = current.readTime;
    }

    if (original.excerpt !== current.excerpt) {
      changes.excerpt = current.excerpt;
    }

    if (original.coverImageUrl !== current.coverImageUrl) {
      changes.coverImageUrl = current.coverImageUrl;
    }

    if (original.sourceUrl !== current.sourceUrl) {
      changes.sourceUrl = current.sourceUrl;
    }

    if (!arraysEqual(original.keywords, current.keywords)) {
      changes.keywords = current.keywords;
    }

    if (original.seoTitle !== current.seoTitle) {
      changes.seoTitle = current.seoTitle;
    }

    if (original.seoDescription !== current.seoDescription) {
      changes.seoDescription = current.seoDescription;
    }

    if (!arraysEqual(original.tags, current.tags)) {
      changes.tags = current.tags;
    }

    if (!arraysEqual(original.imageUrls, current.imageUrls)) {
      changes.imageUrls = current.imageUrls;
    }

    return changes;
  };

  const htmlToMarkdown = useCallback((html: string): string => {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    let liCounter = 1; // Global counter for all li elements

    // Function to process nodes recursively
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || "";
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        const children = Array.from(element.childNodes)
          .map(processNode)
          .join("");

        switch (tagName) {
          case "h1":
            return `# ${children}\n\n`;
          case "h2":
            return `## ${children}\n\n`;
          case "h3":
            return `### ${children}\n\n`;
          case "h4":
            return `#### ${children}\n\n`;
          case "h5":
            return `##### ${children}\n\n`;
          case "h6":
            return `###### ${children}\n\n`;
          case "p":
            return `${children}\n\n`;
          case "br":
            return "\n";
          case "b":
          case "strong":
            return `**${children}**`;
          case "i":
          case "em":
            return `*${children}*`;
          case "code":
            return `\`${children}\``;
          case "pre":
            return `\`\`\`\n${children}\n\`\`\`\n\n`;
          case "blockquote":
            return `> ${children}\n\n`;
          case "ul":
          case "ol":
            // Just return children without any wrapper formatting
            return children;
          case "li":
            const listItem = `${liCounter}. ${children.replace(/\n\n$/, "")}\n`;
            liCounter++;
            return listItem;
          case "a":
            const href = element.getAttribute("href");
            return href ? `[${children}](${href})` : children;
          case "img":
            const src = element.getAttribute("src");
            const alt = element.getAttribute("alt") || "";
            return src ? `![${alt}](${src})` : "";
          case "table":
            // Basic table support
            const rows = Array.from(element.querySelectorAll("tr"));
            if (rows.length === 0) return children;

            let tableMarkdown = "";
            rows.forEach((row, rowIndex) => {
              const cells = Array.from(row.querySelectorAll("td, th"));
              const cellContents = cells.map((cell) =>
                processNode(cell).trim()
              );
              tableMarkdown += `| ${cellContents.join(" | ")} |\n`;

              // Add separator after header row
              if (rowIndex === 0 && cells.length > 0) {
                tableMarkdown += `| ${cells.map(() => "---").join(" | ")} |\n`;
              }
            });
            return tableMarkdown + "\n";
          case "div":
          case "span":
            // Check for specific styling
            const style = element.getAttribute("style") || "";
            if (
              style.includes("font-weight: bold") ||
              style.includes("font-weight:bold")
            ) {
              return `**${children}**`;
            }
            if (
              style.includes("font-style: italic") ||
              style.includes("font-style:italic")
            ) {
              return `*${children}*`;
            }
            return children;
          default:
            return children;
        }
      }

      return "";
    };

    return processNode(tempDiv).trim();
  }, []);

  const handlePaste = useCallback(
    (
      event: React.ClipboardEvent<HTMLDivElement>,
      field: "content" | "conclusion"
    ) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const htmlContent = clipboardData.getData("text/html");
      const plainText = clipboardData.getData("text/plain");

      // Only process HTML content if it exists and is non-empty
      if (htmlContent && htmlContent.trim() !== "") {
        event.preventDefault(); // Prevent default paste to avoid raw HTML insertion
        const markdownContent = htmlToMarkdown(htmlContent);
        setFormData((prev) => ({
          ...prev,
          [field]: prev[field]
            ? `${prev[field]}\n\n${markdownContent}`
            : markdownContent,
        }));
      }
      // If only plain text is available, the editor will handle it natively
    },
    [htmlToMarkdown, setFormData] // Include setFormData in dependencies
  );

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
      seoTitle: title.length <= 60 ? title : title.substring(0, 60),
    }));
  };

  const uploadFileToAPI = async (file: File, slug: string): Promise<string> => {
    // Validate inputs
    if (!file || !slug) {
      throw new Error("File and slug are required");
    }

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("folderName", `/blog/${slug}`);

    try {
      const response = await fetch(
        "https://staging.api.infigon.app/v1/teams/util/upload-file",
        {
          method: "POST",
          headers: {
            Accept: "*/*",
          },
          credentials: "include",
          body: formDataUpload,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }

      const result = await response.json();
      return result.fileUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

  const validateFileSize = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      alert(
        `File "${file.name}" exceeds the maximum size limit of 5MB. Please choose a smaller file.`
      );
      return false;
    }
    return true;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.slug) {
      alert(
        "Please select a file and ensure a title is provided to generate a slug."
      );
      return;
    }

    // Validate file size
    if (!validateFileSize(file)) {
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadFileToAPI(file, formData.slug);
      setFormData((prev) => ({
        ...prev,
        coverImage: file,
        coverImageUrl: uploadedUrl,
        imageUrls: [...prev.imageUrls, uploadedUrl],
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      alert(`Error uploading cover image: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContentImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isConclusion: boolean = false
  ) => {
    const files = e.target.files;
    if (!files || !formData.slug) {
      alert(
        "Please select a file and ensure a title is provided to generate a slug."
      );
      return;
    }

    const newFiles = Array.from(files);

    // Validate all files before proceeding
    for (const file of newFiles) {
      if (!validateFileSize(file)) {
        return;
      }
    }

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of newFiles) {
        const uploadedUrl = await uploadFileToAPI(file, formData.slug);
        uploadedUrls.push(uploadedUrl);
        setFormData((prev) => ({
          ...prev,
          imageUrls: [...prev.imageUrls, uploadedUrl],
        }));
      }

      const imageMarkdown = uploadedUrls
        .map((url, index) => `![Image ${Date.now() + index}](${url})`)
        .join("\n\n");

      const editorRef = isConclusion ? conclusionEditorRef : contentEditorRef;
      const field = isConclusion ? "conclusion" : "content";
      const currentValue = formData[field] || "";

      if (editorRef.current) {
        const textarea = editorRef.current;
        const startPos = textarea.selectionStart || currentValue.length;
        const endPos = textarea.selectionEnd || currentValue.length;
        const newValue =
          currentValue.substring(0, startPos) +
          (startPos > 0 && currentValue[startPos - 1] !== "\n" ? "\n\n" : "") +
          imageMarkdown +
          (currentValue[endPos] !== "\n" ? "\n\n" : "") +
          currentValue.substring(endPos);

        setFormData((prev) => ({
          ...prev,
          [field]: newValue,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [field]: currentValue
            ? `${currentValue}\n\n${imageMarkdown}`
            : imageMarkdown,
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      alert(`Error uploading content image: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const parseFormattedText = (text: string): FormattedText[] => {
    const parts: FormattedText[] = [];
    let currentIndex = 0;

    const patterns = [
      // Bold and italic combined (***text***) - exactly 3 stars at start and end
      { regex: /(?<!\*)\*{3}([^*]+)\*{3}(?!\*)/g, type: "bold-italic" },
      // Bold only (**text**) - exactly 2 stars at start and end
      { regex: /(?<!\*)\*{2}([^*]+)\*{2}(?!\*)/g, type: "bold" },
      // Italic only (*text*) - exactly 1 star at start and end
      { regex: /(?<!\*)\*{1}([^*]+)\*{1}(?!\*)/g, type: "italic" },
      // Code (`text`)
      { regex: /`([^`]+)`/g, type: "code" },
      // Links ([text](url))
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: "link" },
    ];

    const matches: Array<{
      index: number;
      length: number;
      text: string;
      type: string;
      url?: string;
    }> = [];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          text: match[1],
          type: pattern.type,
          url: pattern.type === "link" ? match[2] : undefined,
        });
      }
    });

    matches.sort((a, b) => a.index - b.index);

    matches.forEach((match) => {
      if (match.index > currentIndex) {
        const plainText = text.substring(currentIndex, match.index);
        if (plainText) {
          parts.push({ text: plainText });
        }
      }

      const formattedPart: FormattedText = { text: match.text };

      switch (match.type) {
        case "bold":
          formattedPart.bold = true;
          break;
        case "italic":
          formattedPart.italic = true;
          break;
        case "bold-italic":
          formattedPart.bold = true;
          formattedPart.italic = true;
          break;
        case "code":
          formattedPart.code = true;
          break;
        case "link":
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
    const lines = markdownContent.split("\n");
    let currentBlock: ContentBlock | null = null;
    let tableRows: string[][] = [];
    let inTable = false;
    let inCodeBlock = false;
    let codeContent = "";
    let codeLanguage = "";
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
          codeLanguage = codeBlockMatch[1] || "";
          codeContent = "";
        } else {
          blocks.push({
            type: "code",
            rawContent: "```" + codeLanguage + "\n" + codeContent + "\n```",
            text: codeContent,
            language: codeLanguage,
          });
          inCodeBlock = false;
          codeContent = "";
          codeLanguage = "";
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent += (codeContent ? "\n" : "") + line;
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
            type: "list",
            items: listItems,
            rawContent: listItems.map((item) => `- ${item}`).join("\n"),
          });
          listItems = [];
          inList = false;
        }
        blocks.push({
          type: "blockquote",
          text: blockquoteMatch[1],
          rawContent: trimmedLine,
          formattedContent: parseFormattedText(blockquoteMatch[1]),
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
            type: "list",
            items: listItems,
            rawContent: listItems.map((item) => `- ${item}`).join("\n"),
          });
          listItems = [];
          inList = false;
        }
        blocks.push({
          type: "image",
          alt: imageMatch[1],
          src: imageMatch[2],
          rawContent: trimmedLine,
        });
        continue;
      }

      if (trimmedLine.includes("|") && !trimmedLine.match(/^[\s\-\|]+$/)) {
        if (!inTable) {
          if (currentBlock) {
            blocks.push(currentBlock);
            currentBlock = null;
          }
          if (inList) {
            blocks.push({
              type: "list",
              items: listItems,
              rawContent: listItems.map((item) => `- ${item}`).join("\n"),
            });
            listItems = [];
            inList = false;
          }
          inTable = true;
          tableRows = [];
        }

        const cells = trimmedLine
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell);
        if (cells.length > 0) {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        if (tableRows.length > 0) {
          const tableMarkdown = tableRows
            .map((row) => `| ${row.join(" | ")} |`)
            .join("\n");
          blocks.push({
            type: "table",
            headers: tableRows[0] || [],
            rows: tableRows.slice(1) || [],
            rawContent: tableMarkdown,
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
          listItems[listItems.length - 1] += " " + trimmedLine;
        }
        continue;
      } else if (inList) {
        blocks.push({
          type: "list",
          items: listItems,
          rawContent: listItems.map((item) => `- ${item}`).join("\n"),
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
          type: "heading",
          level: headingMatch[1].length,
          text: headingMatch[2],
          rawContent: trimmedLine,
          formattedContent: parseFormattedText(headingMatch[2]),
        });
        continue;
      }

      if (trimmedLine) {
        if (!currentBlock) {
          currentBlock = {
            type: "text",
            text: trimmedLine,
            rawContent: trimmedLine,
            formattedContent: parseFormattedText(trimmedLine),
          };
        } else {
          currentBlock.text += "\n" + trimmedLine;
          currentBlock.rawContent += "\n" + trimmedLine;
          currentBlock.formattedContent = parseFormattedText(
            currentBlock.text!
          );
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
      const tableMarkdown = tableRows
        .map((row) => `| ${row.join(" | ")} |`)
        .join("\n");
      blocks.push({
        type: "table",
        headers: tableRows[0] || [],
        rows: tableRows.slice(1) || [],
        rawContent: tableMarkdown,
      });
    }

    if (inList && listItems.length > 0) {
      blocks.push({
        type: "list",
        items: listItems,
        rawContent: listItems.map((item) => `- ${item}`).join("\n"),
      });
    }

    return blocks;
  };

  // Updated keyword handling with comma-separated support
  const addKeywords = () => {
    const trimmed = newKeyword.trim();
    if (trimmed) {
      // Split by comma and process each keyword
      const newKeywords = trimmed
        .split(",")
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword && !formData.keywords.includes(keyword));

      if (newKeywords.length > 0) {
        setFormData((prev) => ({
          ...prev,
          keywords: [...prev.keywords, ...newKeywords],
        }));
        setNewKeyword("");
      }
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((keyword) => {
        if (typeof keyword === "object") {
          return (keyword.word || keyword.title || "") !== keywordToRemove;
        }
        return keyword !== keywordToRemove;
      }),
    }));
  };

  // Updated tag handling with comma-separated support
  const addTags = () => {
    const trimmed = newTag.trim();
    if (trimmed) {
      // Split by comma and process each tag
      const newTags = trimmed
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag && !formData.tags.includes(tag));

      if (newTags.length > 0) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, ...newTags],
        }));
        setNewTag("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => {
        if (typeof tag === "object") {
          return (tag.word || tag.title || "") !== tagToRemove;
        }
        return tag !== tagToRemove;
      }),
    }));
  };

  const handleSave = async () => {
    if (!params.id) {
      alert("Blog ID not found");
      return;
    }

    if (!formData.title || !formData.content) {
      alert("Please fill in all required fields (Title, Content).");
      return;
    }

    if (!originalFormData) {
      alert("Original data not loaded. Please refresh and try again.");
      return;
    }

    try {
      setIsSaving(true);

      // Get only the changed fields
      const changedFields = getChangedFields(originalFormData, formData);

      // Check if there are any changes
      if (Object.keys(changedFields).length === 0) {
        alert("No changes detected.");
        setIsSaving(false);
        return;
      }

      console.log("Changed fields:", changedFields);
      console.log("Stringified JSON:", JSON.stringify(changedFields, null, 2));

      const response = await fetch(
        `https://staging.api.infigon.app/v1/teams/blogs/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(changedFields),
        }
      );

      console.log("API Response status:", response.status);
      console.log("API Response:", response);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error("API Error Details:", errorData);
        } catch (jsonError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            console.error("API Error Text:", errorText);
            errorData = {
              message:
                errorText || `HTTP ${response.status}: ${response.statusText}`,
              status: response.status,
            };
          } catch (textError) {
            console.error("Could not parse error response:", textError);
            errorData = {
              message: `HTTP ${response.status}: ${response.statusText}`,
              status: response.status,
            };
          }
        }

        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }

      // Parse successful response
      const responseData = await response.json();
      console.log("Success response:", responseData);

      // Update the original form data to current form data after successful save
      setOriginalFormData({ ...formData });
      setIsSaved(true);
      alert("Blog saved successfully!");
    } catch (error) {
      console.error("Error saving blog post:", error);

      // More detailed error handling
      let errorMessage = "An unexpected error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      alert(`Error saving blog post: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };
  const handlePublish = async () => {
    if (!params.id) {
      alert("Blog ID not found");
      return;
    }

    if (!isSaved) {
      alert("Please save the blog first before publishing.");
      return;
    }

    try {
      setIsPublishing(true);

      const publishResponse = await fetch(
        `https://staging.api.infigon.app/v1/teams/blogs/publish/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ published: true }),
        }
      );

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! Status: ${publishResponse.status}`
        );
      }

      alert("Blog published successfully!");
      router.push("/allBlogs");
    } catch (error) {
      console.error("Error publishing blog post:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      alert(`Error publishing blog post: ${errorMessage}`);
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 py-10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading blog data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 py-10">
      <div className="container max-w-4xl mx-auto px-4 space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Update Blog Post</h1>
              <p className="text-sm text-muted-foreground">
                Edit your blog post and save changes ✍️
              </p>
            </div>
          </div>
        </div>

        {isUploading && (
          <div className="fixed top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 z-50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading images...</span>
          </div>
        )}

        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>
                Title, excerpt, and source information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, slug: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Read Time (min)</Label>
                <Input
                  type="number"
                  value={formData.readTime}
                  min="1"
                  max="1440"
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, readTime: +e.target.value }))
                  }
                />
              </div>

              <div>
                <Label>Excerpt</Label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, excerpt: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                Write your blog in Markdown. Copy and paste formatted content
                from any source - it will automatically preserve formatting
                including bold text, headings, spacing, and line breaks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Main Content *</Label>
                <div className="border rounded-md">
                  <MDEditor
                    value={formData.content}
                    onChange={(v) =>
                      setFormData((p) => ({ ...p, content: v || "" }))
                    }
                    height={400}
                    data-color-mode="light"
                    onPaste={(e) => handlePaste(e, "content")}
                    textareaProps={{
                      placeholder: `Enter your content here... You can paste formatted content and it will be converted to Markdown automatically.`,
                    }}
                  />
                </div>
                <div className="mt-2">
                  <Label>Upload Content Images</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleContentImageUpload(e, false)}
                    disabled={isUploading || !formData.slug}
                  />
                  {!formData.slug && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter a title first to enable image upload
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Conclusion (Optional)</Label>
                <div className="border rounded-md">
                  <MDEditor
                    value={formData.conclusion}
                    onChange={(v) =>
                      setFormData((p) => ({ ...p, conclusion: v || "" }))
                    }
                    height={400}
                    data-color-mode="light"
                    onPaste={(e) => handlePaste(e, "conclusion")}
                    textareaProps={{
                      placeholder: `Enter your conclusion here... You can paste formatted conclusion and it will be converted to Markdown automatically.`,
                    }}
                  />
                </div>
                <div className="mt-2">
                  <Label>Upload Conclusion Images</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleContentImageUpload(e, true)}
                    disabled={isUploading || !formData.slug}
                  />
                  {!formData.slug && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter a title first to enable image upload
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
              <CardDescription>
                Upload a cover image for your blog post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Upload Cover Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isUploading || !formData.slug}
                  />
                  {!formData.slug && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter a title first to enable image upload
                    </p>
                  )}
                </div>
                <div>
                  <Label>Alt Text *</Label>
                  <Input
                    value={formData.coverImageAlt}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        coverImageAlt: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              {formData.coverImageUrl && (
                <div className="mt-4">
                  <Label>Cover Image Preview</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <img
                      src={formData.coverImageUrl}
                      alt={formData.coverImageAlt}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}
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
                  <Input
                    value={formData.seoTitle}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, seoTitle: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>SEO Description</Label>
                  <Textarea
                    value={formData.seoDescription}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        seoDescription: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Keywords</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter keywords separated by commas (e.g., react, javascript,
                  web development)
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Enter keywords separated by commas..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeywords();
                      }
                    }}
                  />
                  <Button type="button" onClick={addKeywords}>
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.keywords.map((keyword, index) => (
                    <Badge
                      key={`${
                        typeof keyword === "object" ? keyword.id : keyword
                      }-${index}`}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {typeof keyword === "object"
                        ? keyword.word || keyword.title || ""
                        : keyword}
                      <X
                        className="w-3 h-3 cursor-pointer hover:bg-destructive/20 rounded-full"
                        onClick={() =>
                          removeKeyword(
                            typeof keyword === "object"
                              ? keyword.word || keyword.title || ""
                              : keyword
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Enter tags separated by commas (e.g., tutorial, beginner,
                  advanced)
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter tags separated by commas..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTags();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTags}>
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge
                      key={`${typeof tag === "object" ? tag.id : tag}-${index}`}
                      variant="outline"
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={() =>
                        removeTag(
                          typeof tag === "object"
                            ? tag.word || tag.title || ""
                            : tag
                        )
                      }
                    >
                      {typeof tag === "object"
                        ? tag.word || tag.title || ""
                        : tag}
                      <X
                        className="w-3 h-3 cursor-pointer hover:bg-destructive/20 rounded-full"
                        onClick={() =>
                          removeTag(
                            typeof tag === "object"
                              ? tag.word || tag.title || ""
                              : tag
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              disabled={isSaving || isPublishing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isPublishing || loading}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Blog"
              )}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!isSaved || isSaving || isPublishing || loading}
              onClick={handlePublish}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Blog"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateBlog;
