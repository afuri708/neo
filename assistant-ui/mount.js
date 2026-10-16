import { mount } from 'svelte'
import App from './App.svelte'

const target = document.createElement('div')
target.id = 'assistant-root'
document.querySelector('#sticky-list').after(target)

mount(App, { target })