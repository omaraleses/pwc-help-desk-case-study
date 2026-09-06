"use client"

import { useEffect } from "react"

// Browsers restore pages from the back/forward cache as-is, so a stale
// navbar (previous session name and role) can show after sign-out or
// account switches. Reload whenever a page is restored from bfcache.
export function BfcacheReload() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload()
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])

  return null
}
