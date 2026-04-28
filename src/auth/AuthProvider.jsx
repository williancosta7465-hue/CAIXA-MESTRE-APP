import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSession, initAuth, login as loginFn, logout as logoutFn } from './auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    ;(async () => {
      await initAuth()
      setSession(getSession())
      setReady(true)
    })()
  }, [])

  const value = useMemo(() => {
    return {
      ready,
      session,
      async login(payload) {
        const s = await loginFn(payload)
        setSession(s)
        return s
      },
      async logout() {
        await logoutFn()
        setSession(null)
      }
    }
  }, [ready, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
