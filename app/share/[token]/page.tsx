interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;

  return (
    <div>
      <main>{token}</main>
      <footer>Powered by Comicly</footer>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  return { title: `Comic — ${token}` };
}
