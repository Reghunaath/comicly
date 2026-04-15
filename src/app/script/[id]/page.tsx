import ScriptReviewPage from "@/frontend/script-review/ScriptReviewPage";

export default async function ScriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ScriptReviewPage comicId={id} />;
}
