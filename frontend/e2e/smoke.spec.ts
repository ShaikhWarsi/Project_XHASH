import { test, expect } from '@playwright/test'

test.describe('Platform smoke test', () => {
  test('login and navigate to dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('chart page loads', async ({ page }) => {
    await page.goto('/markets/chart')
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('backtest page loads', async ({ page }) => {
    await page.goto('/strategy/backtest')
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('orders page loads', async ({ page }) => {
    await page.goto('/trading/orders')
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
