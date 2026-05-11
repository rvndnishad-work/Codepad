import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import BlogEditorContainer from "./BlogEditorContainer";

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const blog = await prisma.blogPost.findUnique({
    where: { id },
  });

  if (!blog) notFound();
  if (blog.userId !== session.user.id) redirect("/dashboard");

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8">
        <BlogEditorContainer initialData={{
          ...blog,
          excerpt: blog.excerpt ?? "",
          coverImage: blog.coverImage ?? "",
          createdAt: blog.createdAt.toISOString(),
          updatedAt: blog.updatedAt.toISOString(),
        }} />
      </main>
    </div>
  );
}
