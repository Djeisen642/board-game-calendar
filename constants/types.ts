import { Vue } from 'nuxt-property-decorator'

export type VForm = Vue & {
  validate():boolean
  reset():void
  resetValidation():void
}

export type NuxtHeadType = {
  title:string
}
