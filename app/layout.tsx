import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const dmSans = localFont({
  src: [
    { path: "../public/fonts/DMSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/DMSans-Italic.ttf", weight: "400", style: "italic" },
    { path: "../public/fonts/DMSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/DMSans-MediumItalic.ttf", weight: "500", style: "italic" },
    { path: "../public/fonts/DMSans-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/DMSans-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/DMSans-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "../public/fonts/DMSans-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Hire Knob",
  description: "Can you spot the AI bias?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className={`${dmSans.className} min-h-full flex flex-col uppercase`}>
        {children}
      </body>
    </html>
  );
}
