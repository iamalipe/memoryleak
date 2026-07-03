const LoadingElement = () => {
  return (
    <main className="flex-1 overflow-hidden flex flex-col p-2 md:p-4 gap-2 md:gap-4">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-primary" />
        <p className="mt-4 text-xl">Loading...</p>
      </div>
    </main>
  );
};
export default LoadingElement;
