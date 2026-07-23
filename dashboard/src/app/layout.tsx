import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SliceLine — Store Dashboard",
  description: "Pizza order management dashboard for Demo Pizza franchise locations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}