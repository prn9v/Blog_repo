'use client'
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-6">
      <div className="bg-white shadow-lg rounded-2xl p-10 flex flex-col gap-6 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900">Blog Dashboard</h1>
        <p className="text-gray-600 text-sm">
          Quickly navigate between all blogs, team blogs, or create a new one.
        </p>

        <div className="flex flex-col gap-4">
          <Button
            onClick={() => router.push('/allBlogs')}
            className="w-full px-6 py-3 cursor-pointer bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200"
          >
            See All Blogs
          </Button>

          <Button
            onClick={() => router.push('/all-team-blogs')}
            className="w-full px-6 py-3 cursor-pointer bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200"
          >
            See All Team Blogs
          </Button>

          <Button
            onClick={() => router.push('/createBlog')}
            className="w-full px-6 py-3 cursor-pointer bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200"
          >
            Create Blog
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
