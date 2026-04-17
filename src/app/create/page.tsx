import { redirect } from "next/navigation";
import QAPage from "@/frontend/qa/QAPage";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) redirect("/");
  return <QAPage comicId={id} />;
}
