import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";

const PageNotFound = () => {
  return (
    <main className="flex-1 overflow-hidden flex flex-col p-2 md:p-4 gap-2 md:gap-4">
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-xl mb-8">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link to="..">Go back</Link>
        </Button>
      </div>
    </main>
  );
};

export default PageNotFound;
