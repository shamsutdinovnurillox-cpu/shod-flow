import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shod Flow — Fleet & Safety Platform",
  description: "SHOD Express uchun ichki Fleet & Safety operatsion tizimi.",
};

// Birinchi bo'yashdan oldin tema va yon panel holatini qo'llaydi — shunda
// sahifa yuklanishida "chaqnash" va panel kengligi sakrashi bo'lmaydi.
const bootScript = `(function(){try{var e=document.documentElement;
var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)e.classList.add('dark');
e.dataset.sidebar=localStorage.getItem('sidebar')==='collapsed'?'collapsed':'expanded';
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
