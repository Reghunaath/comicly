// app/comic/[id]/page.tsx
import ComicViewer from "@/src/components/comic-viewer";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ComicPage({ params }: Props) {
  const { id } = await params;
  // id will be used to fetch real comic data from the API
  void id;
  return <ComicViewer />;
}
