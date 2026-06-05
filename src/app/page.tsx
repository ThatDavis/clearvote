export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-32">
      <main className="flex max-w-xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">clearvote</h1>
        <p className="text-lg leading-8 text-zinc-600">
          A simple ranked-choice voting system for community-run spaces.
        </p>
        <p className="text-sm text-zinc-400">scaffold in progress</p>
      </main>
    </div>
  )
}
