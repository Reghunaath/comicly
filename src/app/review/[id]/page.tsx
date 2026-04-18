import SupervisedReviewPage from "@/frontend/page-review/SupervisedReviewPage";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupervisedReviewPage comicId={id} />;
}
