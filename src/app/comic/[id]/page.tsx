import ComicViewerPage from "@/frontend/comic-viewer/ComicViewerPage";

export default async function ComicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ComicViewerPage comicId={id} />;
}
