import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ollama Chat Interface",
  description: "Chat with a local Ollama model",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="flex flex-col h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}