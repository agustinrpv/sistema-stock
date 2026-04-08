"use client"

import { useRouter } from "next/navigation"
import { Button } from "./ui/button"

export default function Topbar() {
  const router = useRouter()

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4">
      <div>
        <h1 className="text-lg font-semibold text-black">Sistema de Stock</h1>
        <p className="text-sm text-gray-500">Panel administrativo</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => router.refresh()}>
          Actualizar
        </Button>
      </div>
    </header>
  )
}