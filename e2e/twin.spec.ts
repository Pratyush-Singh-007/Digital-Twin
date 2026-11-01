import { expect, test } from '@playwright/test';

const start = Date.UTC(2026, 9, 25);
const mockTimes = Array.from({ length: 168 }, (_, index) => new Date(start + index * 3600000).toISOString().slice(0, 16));
const hourly = {
  time: mockTimes,
  temperature_2m: mockTimes.map(() => 18),
  relative_humidity_2m: mockTimes.map(() => 92),
  dew_point_2m: mockTimes.map(() => 17),
  rain: mockTimes.map(() => 0.2),
  shortwave_radiation: mockTimes.map(() => 100),
  et0_fao_evapotranspiration: mockTimes.map(() => 0.1),
  vapour_pressure_deficit: mockTimes.map(() => 0.1),
  soil_moisture_0_to_7cm: mockTimes.map((_, index) => 0.22 + 0.06 * Math.sin(index / 8)),
  soil_temperature_0_to_7cm: mockTimes.map(() => 19),
};

test('3D field responds to telemetry corruption and evaluation shows stress experiments', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ hourly }),
  }));

  await page.goto('/');
  const field = page.getByTestId('field-3d');
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute('aria-label', /Soil moisture/);
  await expect(field).toHaveAttribute('aria-label', /sensor dropout 0 percent/);
  await expect(page.locator('[data-sensor-gap="true"]')).toHaveCount(0);

  await page.getByTestId('dropout-slider').focus();
  await page.getByTestId('dropout-slider').press('End');
  await expect(page.getByText('40%', { exact: true })).toBeVisible();
  await expect(field).toHaveAttribute('aria-label', /sensor dropout 40 percent/);
  await expect.poll(() => page.locator('[data-sensor-gap="true"]').count()).toBeGreaterThan(0);
  await expect(page.getByTestId('field-status')).toHaveText(/SAFETY BRAKE|DISEASE ALERT/);

  await page.getByTestId('pages-menu-button').click();
  await page.getByRole('button', { name: /Evaluation/ }).click();
  await expect(page.getByTestId('robustness-row')).toHaveCount(8);
  await expect(page.getByText('Heat shock (+15°C)')).toBeVisible();
  await expect(page.getByText('Drought shock (−60%)')).toBeVisible();
  await expect(page.getByTestId('agronomic-validation')).toContainText('4/4 constructed scenarios');
});
