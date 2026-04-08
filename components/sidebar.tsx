"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Productos" },
  { href: "/stock", label: "Stock" },
  { href: "/ingresos", label: "Ingresos" },
  { href: "/unidades", label: "Unidades / IMEI" },
  { href: "/ventas", label: "Ventas / POS" },
  { href: "/historial", label: "Movimientos" },
  { href: "/alertas", label: "Alertas" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen border-r bg-black text-white">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Sistema Stock</h2>
        <p className="text-sm text-gray-400">Tienda de tecnología</p>
      </div>

      <nav className="p-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-white text-black font-medium"
                  : "text-gray-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}