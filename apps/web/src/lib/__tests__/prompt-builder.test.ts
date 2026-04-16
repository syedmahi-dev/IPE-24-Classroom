import { describe, it, expect } from 'vitest'
import { buildChatHistory, SYSTEM_INSTRUCTION } from '../prompt-builder'

describe('buildChatHistory', () => {
  it('should include system instruction and confirmation in the beginning', () => {
    const history = buildChatHistory([])
    
    expect(history[0]).toEqual({
      role: 'user',
      parts: [{ text: SYSTEM_INSTRUCTION }]
    })
    expect(history[1]).toEqual({
      role: 'model',
      parts: [{ text: 'Understood. I am ready to assist the IPE-24 students.' }]
    })
    expect(history).toHaveLength(2)
  })

  it('should map user and model history correctly', () => {
    const inputHistory: any[] = [
      { role: 'user', content: 'What is the routine?' },
      { role: 'model', content: 'Here is the routine...' }
    ]
    const history = buildChatHistory(inputHistory)
    
    expect(history).toHaveLength(4)
    expect(history[2]).toEqual({
      role: 'user',
      parts: [{ text: 'What is the routine?' }]
    })
    expect(history[3]).toEqual({
      role: 'model',
      parts: [{ text: 'Here is the routine...' }]
    })
  })

  it('should maintain the correct role order', () => {
    const inputHistory: any[] = [
      { role: 'user', content: 'Hello' },
      { role: 'model', content: 'Hi' },
      { role: 'user', content: 'Bye' }
    ]
    const history = buildChatHistory(inputHistory)
    
    expect(history[2].role).toBe('user')
    expect(history[3].role).toBe('model')
    expect(history[4].role).toBe('user')
  })
})
