import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "SafeNotify - Notificaciones con Privacidad en Colombia",
  description: "Sistema de notificaciones colombiano con eliminación automática de datos. Privacidad por diseño, sin almacenamiento permanente y transparencia total. Pagos con Wompi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className="font-sans antialiased scroll-smooth"
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
