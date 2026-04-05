interface Props {
  params: Promise<{ id: string }>;
}

export default async function ComicPage({ params }: Props) {
  const { id } = await params;

  return <div>Comic {id}</div>;
}
