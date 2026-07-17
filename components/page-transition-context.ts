import { createContext, useContext } from "react"

const InitialPageLoadContext = createContext(true)

export const InitialPageLoadProvider = InitialPageLoadContext.Provider

export function useInitialPageLoad() {
  return useContext(InitialPageLoadContext)
}
