export const metadata = {
  title: 'Play3D',
  description: 'AI-Powered 3D Model Generator',
};

import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
