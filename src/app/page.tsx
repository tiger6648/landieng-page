import ContactForm from "@/components/ContactForm";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            문의하기
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            궁금한 점을 남겨주시면 빠르게 답변드리겠습니다.
          </p>
        </div>
        <ContactForm />
      </main>
    </div>
  );
}
