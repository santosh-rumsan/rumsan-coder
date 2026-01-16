import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { AlertProvider } from "@/components/AlertProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rumsan Coder - VS Code Clone",
  description: "A VS Code-like application with GitHub integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <AlertProvider>{children}</AlertProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
