import "./globals.css"
import Sidebar from "../components/sidebar"
import Topbar from "../components/topbar"

export const metadata = {
  title: "Sistema de Stock",
  description: "Sistema de gestión para tienda de tecnología",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex bg-zinc-100">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Topbar />
            <main className="p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}