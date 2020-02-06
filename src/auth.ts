import Vue from "vue"

export interface User {
  displayName: string
  token: string
}

export const state = Vue.observable({
  user: null as User | null
})

const redirectUri = location.origin + "/oauth-callback.html"

export async function signInWithDiscord() {
  open(`https://discordapp.com/api/v6/oauth2/authorize?${new URLSearchParams({
    client_id: process.env.VUE_APP_DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state: "discord"
  })}`)
}

export async function signInWithGoogle() {
  open(`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: process.env.VUE_APP_GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "profile",
    state: "google"
  })}`)
}

export async function signOut() {
  state.user = null
}

addEventListener("message", event => {
  if (typeof event.data != "string" || !event.data.startsWith("?")) return
  const params = new URLSearchParams(event.data)
  const error = params.get("error")
  if (error) return console.error(error)

  const code = params.get("code")
  const state_ = params.get("state")
  if (!state_ || !code) return console.error("invalid auth response")

  fetch(`${process.env.VUE_APP_API}/authenticate/${state_}?${new URLSearchParams({ code, redirect_uri: redirectUri })}`, {
    method: "POST"
  }).then(async response => {
    if (!response.ok) throw new Error(response.statusText)
    state.user = await response.json()
  }).catch(console.error)
})

new Vue({ data: state }).$watch(() => state.user, user => {
  localStorage.loopoverUser = JSON.stringify(user)
})

try {
  const data = JSON.parse(localStorage.loopoverUser)
  state.user = data

  if (state.user) {
    fetch(`${process.env.VUE_APP_API}/me`, {
      headers: {
        Authorization: `Bearer ${state.user.token}`
      }
    }).then(async res => {
      if (res.status == 401) {
        state.user = null
      } else if (res.ok) {
        const user = await res.json()
        Object.assign(state.user, user)
      } else {
        console.error(res.statusText)
      }
    })
  }
} catch { }
