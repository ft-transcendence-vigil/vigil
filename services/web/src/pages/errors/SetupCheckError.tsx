export default function SetupCheckError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Unable to connect</h1>
        <p className="mt-2 text-sm text-slate-400">Please try again.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
