import Link from "next/link";

const features = [
  {
    title: "Plain English questions",
    body: "Ask what you want to know. No formulas, no SQL, no analyst needed.",
  },
  {
    title: "Automatic charts",
    body: "Lumin picks the right chart when a picture answers the question better than text.",
  },
  {
    title: "Anomalies and export",
    body: "Spot outliers in numeric columns, pin key findings, and export to PDF.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold">Lumin</span>
        <Link
          href="/login"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Ask your data anything.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Upload a CSV, JSON, or text file and ask questions in plain English.
          Lumin answers with charts and flags anomalies, so a small team gets an
          analyst without hiring one.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-5 py-2.5 font-medium transition-colors hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-border p-5">
            <h2 className="font-medium">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Lumin
        </div>
      </footer>
    </main>
  );
}
