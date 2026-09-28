import ContactForm from "@/components/ContactForm";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 sm:p-10 dark:bg-zinc-950 dark:ring-zinc-800">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            문의하기
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            궁금하신 점을 남겨 주시면 확인 후 연락드리겠습니다.
          </p>
        </header>
        <ContactForm />
      </main>
    </div>
  );
}
