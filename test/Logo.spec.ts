import { mount } from '@vue/test-utils'
import { describe, test, expect } from 'vitest'
import { createVuetify } from 'vuetify'
import BGCLogo from '~/components/BGCLogo.vue'

const vuetify = createVuetify()

describe('BGCLogo', () => {
  test('is a Vue instance', () => {
    const wrapper = mount(BGCLogo, {
      global: {
        plugins: [vuetify],
      },
    })
    expect(wrapper.vm).toBeTruthy()
  })
})
