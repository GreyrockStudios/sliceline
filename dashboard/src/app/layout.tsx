import "./globals.css";

export const metadata = {
  title: "SliceLine — Dashboard",
  description: "Pizza franchise management and order tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}