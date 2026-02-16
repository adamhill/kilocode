/* @refresh reload */
console.log("[Kilo Debug] index.tsx loaded")

import "@kilocode/kilo-ui/styles"
console.log("[Kilo Debug] styles imported")

import { render } from "solid-js/web"
console.log("[Kilo Debug] solid-js/web imported")

import App from "./App"
console.log("[Kilo Debug] App imported")

const root = document.getElementById("root")
console.log("[Kilo Debug] root element:", root)

if (!root) {
  console.error("[Kilo Debug] Root element not found!")
  throw new Error("Root element not found")
}

console.log("[Kilo Debug] About to render App")
try {
  render(() => <App />, root)
  console.log("[Kilo Debug] App rendered successfully")
} catch (error) {
  console.error("[Kilo Debug] Error rendering App:", error)
  throw error
}
