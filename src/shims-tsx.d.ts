import Vue, { VNode } from "vue"
import { State } from "./state"

declare global {
  namespace JSX {
    interface Element extends VNode {}
    interface ElementClass extends Vue {}
    interface IntrinsicElements {
      [elem: string]: any
    }
  }

  interface Window {
    state: State
  }

  function track(type: string, category?: string, action?: string, label?: string): void
}

declare module "vue/types/vue" {
  interface Vue {
    $state: State
  }
}
