import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Наши годы в кадрах",
  description: "Закрытый семейный фотоальбом для годовщины свадьбы.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
