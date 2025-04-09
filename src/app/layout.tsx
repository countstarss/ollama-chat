import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/ui/sidebar/index";
import { SidebarProvider } from "@/components/context/sidebar-context";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

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
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            --sidebar-width: 260px;
          }
        `}</style>
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delayDuration={0}>
            <SidebarProvider>
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <main className={cn(
                  "flex-1 flex flex-col overflow-hidden transition-all duration-300",
                  "md:ml-[260px] ml-[180px]"
                )}>
                  <div className="flex flex-col h-screen">
                    {children}
                  </div>
                </main>
              </div>
              <Toaster />
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}