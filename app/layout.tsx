import './globals.css';

export const metadata = { title: 'PetCard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}


