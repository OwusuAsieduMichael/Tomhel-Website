export default {
  name: "default",
  title: "Tomhel CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  plugins: [],
  schema: {
    types: [
      {
        name: "newsArticle",
        title: "News Article",
        type: "document",
        fields: [
          { name: "title", title: "Title", type: "string", validation: (Rule: { required: () => unknown }) => Rule.required() },
          { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
          { name: "excerpt", title: "Excerpt", type: "text", rows: 3 },
          {
            name: "category",
            title: "Category",
            type: "string",
            options: {
              list: ["News", "Events", "Announcements", "Achievements"],
            },
          },
          { name: "publishedAt", title: "Published At", type: "datetime" },
          { name: "mainImage", title: "Main Image", type: "image" },
          { name: "body", title: "Body", type: "array", of: [{ type: "block" }] },
        ],
      },
    ],
  },
};
