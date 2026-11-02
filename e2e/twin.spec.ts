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

test('3D field responds to telemetry corruption', async ({ page }) => {
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
  await expect(page.getByTestId('operational-readiness')).toContainText('Prototype only');
  await expect(page.getByTestId('operational-readiness')).toContainText('not 12 independent probes');
  await expect(page.locator('[data-sensor-gap="true"]')).toHaveCount(0);

  await page.getByTestId('camera-top').click();
  await expect(page.getByTestId('camera-top')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('zoom-in').click();
  await expect(page.getByTestId('field-zoom-level')).toHaveText('125%');
  await page.getByTestId('zoom-out').click();
  await expect(page.getByTestId('field-zoom-level')).toHaveText('100%');
  const initialViewBox = await field.getAttribute('viewBox');
  const fieldBox = await field.boundingBox();
  if (!fieldBox) throw new Error('Field viewport was not measurable');
  await page.mouse.move(fieldBox.x + fieldBox.width * 0.55, fieldBox.y + fieldBox.height * 0.75);
  await page.mouse.down();
  await page.mouse.move(fieldBox.x + fieldBox.width * 0.6, fieldBox.y + fieldBox.height * 0.8);
  await page.mouse.up();
  await expect(field).not.toHaveAttribute('viewBox', initialViewBox!);
  await page.getByTestId('reset-field-view').click();
  await expect(field).toHaveAttribute('viewBox', initialViewBox!);
  await page.getByTestId('layer-health').click();
  await expect(page.getByTestId('layer-health')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(50);
  await page.getByRole('button', { name: /Plot 1,/ }).click();
  await expect(page.getByTestId('selected-field-item')).toBeVisible();

  await page.getByTestId('dropout-slider').focus();
  await page.getByTestId('dropout-slider').press('End');
  await expect(page.getByText('40%', { exact: true })).toBeVisible();
  await expect(field).toHaveAttribute('aria-label', /sensor dropout 40 percent/);
  await expect.poll(() => page.locator('[data-sensor-gap="true"]').count()).toBeGreaterThan(0);
  await expect(page.getByTestId('field-status')).toHaveText(/SAFETY BRAKE|WETNESS ADVISORY/);

});
