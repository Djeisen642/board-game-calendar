import { mount } from '@vue/test-utils'
import BGCLogo from '~/components/BGCLogo.vue'

describe('BGCLogo', () => {
  test('is a Vue instance', () => {
    const wrapper = mount(BGCLogo)
    expect(wrapper.vm).toBeTruthy()
  })
})
