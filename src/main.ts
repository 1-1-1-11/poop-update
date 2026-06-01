import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins globally
gsap.registerPlugin(ScrollTrigger)

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  return { app }
}
