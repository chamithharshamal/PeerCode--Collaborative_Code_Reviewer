// Import jest-dom matchers
import '@testing-library/jest-dom'

// Extend expect with jest-dom matchers
import { expect } from '@jest/globals'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:5000'

// Ensure Jest globals are available
global.jest = jest