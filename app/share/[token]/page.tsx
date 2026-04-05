// app/share/[token]/page.tsx
interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  return <div>{token}</div>;
}
