import { useThemeStore } from '../stores/theme'
import { gsap } from 'gsap'

export function useThemeTransition() {
  const themeStore = useThemeStore()

  const switchTheme = () => {
    // If on Web / H5, apply GSAP fade effect during theme switch
    if (typeof document !== 'undefined') {
      themeStore.toggleTheme()
      
      // Animate transition on H5
      gsap.fromTo('.page-container, .theme-wrapper', 
        { opacity: 0.7, y: 5 }, 
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
    } else {
      // Fallback for WeChat Mini-Program or App
      themeStore.toggleTheme()
      
      // Provide a light vibration feedback
      uni.vibrateShort({})
    }
  }

  return {
    switchTheme
  }
}
